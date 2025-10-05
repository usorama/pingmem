#!/usr/bin/env node

/**
 * Codebase Map Generator
 *
 * Scans the project structure and generates comprehensive codebase-map.json
 * Including: directory purposes, protected boundaries, tech stack, key files
 *
 * Usage: node generate-codebase-map.js [--output path] [--config path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - dynamically resolved based on project structure
const PROJECT_ROOT = findProjectRoot();
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, '.claude/config/codebase-scan.json');
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, '.memories/codebase-map.json');

/**
 * Find project root by looking for .memories directory
 * @returns {string} Project root path
 */
function findProjectRoot() {
  let currentDir = process.cwd();

  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, '.memories')) ||
        fs.existsSync(path.join(currentDir, '.claude'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Load configuration from file or use defaults
 * @param {string} configPath - Path to configuration file
 * @returns {Object} Configuration object
 */
function loadConfig(configPath) {
  const defaultConfig = {
    project_name: path.basename(PROJECT_ROOT),
    protected_boundaries: [],
    analyze_dirs: [],
    ignore_dirs: [
      'node_modules',
      '.next',
      'dist',
      'build',
      '.git',
      '.venv',
      '__pycache__',
      '.pytest_cache',
      'out',
      'coverage'
    ],
    tech_stack_detection: {
      enabled: true,
      package_files: ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml']
    },
    scan_depth: 2
  };

  if (!configPath || !fs.existsSync(configPath)) {
    console.log('⚠️  No config file found, using auto-detection...');
    return defaultConfig;
  }

  try {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return { ...defaultConfig, ...userConfig };
  } catch (error) {
    console.error('❌ Error loading config:', error.message);
    return defaultConfig;
  }
}

/**
 * Auto-detect directories to analyze
 * @returns {Array<string>} List of directories to analyze
 */
function autoDetectDirectories() {
  const dirs = [];
  const entries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (['node_modules', 'dist', 'build', 'out'].includes(entry.name)) continue;

    dirs.push(entry.name);
  }

  return dirs;
}

/**
 * Read package.json to extract tech stack
 */
function getTechStack(pkgPath) {
  if (!fs.existsSync(pkgPath)) return [];

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const stack = [];

  // Detect major frameworks/libraries
  const detectors = {
    'next': (ver) => `Next.js ${ver.replace('^', '')}`,
    'react': (ver) => `React ${ver.replace('^', '')}`,
    'vue': (ver) => `Vue.js ${ver.replace('^', '')}`,
    'angular': (ver) => `Angular ${ver.replace('^', '')}`,
    'typescript': () => 'TypeScript',
    '@supabase/supabase-js': () => 'Supabase',
    'firebase': () => 'Firebase',
    'express': (ver) => `Express ${ver.replace('^', '')}`,
    'fastify': (ver) => `Fastify ${ver.replace('^', '')}`,
    'tailwindcss': () => 'Tailwind CSS',
    'bootstrap': () => 'Bootstrap',
    'prisma': () => 'Prisma ORM',
    'mongoose': () => 'Mongoose ODM',
    'jest': () => 'Jest',
    'vitest': () => 'Vitest',
    'playwright': () => 'Playwright',
    'cypress': () => 'Cypress'
  };

  for (const [dep, detector] of Object.entries(detectors)) {
    if (deps[dep]) {
      stack.push(detector(deps[dep]));
    }
  }

  return stack;
}

/**
 * Get current git branch
 */
function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get recent changes from git
 */
function getRecentChanges(limit = 5) {
  try {
    const log = execSync(
      `git log -${limit} --oneline --pretty=format:"%h|%ar|%s"`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8' }
    );

    return log.split('\n').map(line => {
      const [hash, time, message] = line.split('|');
      return { hash, time, message };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Scan directory and build structure
 */
function scanDirectory(dirPath, maxDepth, currentDepth, ignoreDirs) {
  const relativePath = path.relative(PROJECT_ROOT, dirPath);

  if (currentDepth >= maxDepth) return null;

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const entries = fs.readdirSync(dirPath);
  const subdirectories = {};
  const keyFiles = {};

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (ignoreDirs.includes(entry)) continue;

    if (stat.isDirectory()) {
      const subDir = scanDirectory(fullPath, maxDepth, currentDepth + 1, ignoreDirs);
      if (subDir) {
        subdirectories[entry + '/'] = subDir;
      }
    } else if (stat.isFile()) {
      // Track important files
      if (['CLAUDE.md', 'README.md', 'package.json', '.gitignore'].includes(entry)) {
        keyFiles[entry] = getFileDescription(fullPath, entry);
      }
    }
  }

  return {
    purpose: '',  // Can be overridden by config
    ...(Object.keys(subdirectories).length > 0 && { subdirectories }),
    ...(Object.keys(keyFiles).length > 0 && { key_files: keyFiles })
  };
}

/**
 * Get description for important files
 */
function getFileDescription(filePath, fileName) {
  if (fileName === 'CLAUDE.md') {
    return 'Claude Code project instructions and conventions';
  }
  if (fileName === 'README.md') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n').find(line => line.startsWith('#'));
    return firstLine ? firstLine.replace(/^#\s*/, '').trim() : 'Project documentation';
  }
  if (fileName === 'package.json') {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return pkg.description || 'Project dependencies and scripts';
  }
  if (fileName === '.gitignore') {
    return 'Git ignore patterns';
  }
  return '';
}

/**
 * Main function to generate codebase map
 */
function generateCodebaseMap(config) {
  console.log('🗺️  Generating comprehensive codebase map...\n');

  const analyzeDirs = config.analyze_dirs.length > 0
    ? config.analyze_dirs
    : autoDetectDirectories();

  const map = {
    generated_at: new Date().toISOString(),
    version: '1.0',
    project: config.project_name,
    description: config.project_description || 'Auto-generated codebase map',
    current_branch: getCurrentBranch(),
    tech_stack: {},
    structure: {},
    protected_boundaries: config.protected_boundaries || [],
    modifiable_directories: config.modifiable_directories || [],
    recent_changes: getRecentChanges(5),
    last_scan: new Date().toISOString()
  };

  // Detect tech stack if enabled
  if (config.tech_stack_detection?.enabled) {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      map.tech_stack.detected = getTechStack(pkgPath);
    }
  }

  // Scan each analyze directory
  for (const dir of analyzeDirs) {
    const fullPath = path.join(PROJECT_ROOT, dir);
    const structure = scanDirectory(
      fullPath,
      config.scan_depth || 2,
      0,
      config.ignore_dirs
    );
    if (structure) {
      map.structure[dir + '/'] = structure;
    }
  }

  return map;
}

/**
 * Write codebase map to file
 */
function writeCodebaseMap(map, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2), 'utf-8');
  console.log(`✅ Codebase map generated: ${path.relative(PROJECT_ROOT, outputPath)}`);

  // Also update last-updated.json
  const lastUpdatedPath = path.join(path.dirname(outputPath), 'last-updated.json');
  fs.writeFileSync(
    lastUpdatedPath,
    JSON.stringify({
      last_updated: new Date().toISOString(),
      trigger: 'manual_generation',
      files_scanned: Object.keys(map.structure).length
    }, null, 2),
    'utf-8'
  );
  console.log(`✅ Last updated timestamp: ${path.relative(PROJECT_ROOT, lastUpdatedPath)}`);
}

/**
 * CLI interface
 */
function main() {
  const args = process.argv.slice(2);

  const configIndex = args.indexOf('--config');
  const configPath = configIndex >= 0 && args[configIndex + 1]
    ? path.resolve(args[configIndex + 1])
    : DEFAULT_CONFIG_PATH;

  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 && args[outputIndex + 1]
    ? path.resolve(args[outputIndex + 1])
    : DEFAULT_OUTPUT;

  try {
    const config = loadConfig(configPath);
    const map = generateCodebaseMap(config);
    writeCodebaseMap(map, outputPath);

    console.log('\n📊 Codebase Map Statistics:');
    console.log(`   - Directories scanned: ${Object.keys(map.structure).length}`);
    console.log(`   - Protected boundaries: ${map.protected_boundaries.length}`);
    console.log(`   - Modifiable directories: ${map.modifiable_directories.length}`);
    console.log(`   - Current branch: ${map.current_branch}`);
    console.log(`   - Recent changes: ${map.recent_changes.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating codebase map:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateCodebaseMap, writeCodebaseMap, loadConfig };
