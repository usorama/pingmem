#!/usr/bin/env node

/**
 * Memory System Health Check
 *
 * Verifies installation integrity and reports status of:
 * - Directory structure
 * - Configuration files
 * - Ollama availability
 * - Decision records
 * - Codebase map freshness
 *
 * Usage: node health-check.js [--verbose]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = findProjectRoot();
const VERBOSE = process.argv.includes('--verbose');

/**
 * Find project root by looking for .memories directory
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

  return process.cwd();
}

/**
 * Check results tracker
 */
const results = {
  passed: [],
  warnings: [],
  failed: []
};

/**
 * Add check result
 */
function addResult(status, message, details = null) {
  const result = { message, details };

  if (status === 'pass') {
    results.passed.push(result);
    console.log(`   ✅ ${message}`);
  } else if (status === 'warn') {
    results.warnings.push(result);
    console.log(`   ⚠️  ${message}`);
  } else {
    results.failed.push(result);
    console.log(`   ❌ ${message}`);
  }

  if (VERBOSE && details) {
    console.log(`      ${details}`);
  }
}

/**
 * Check directory structure
 */
function checkDirectoryStructure() {
  console.log('\n📁 Checking directory structure...\n');

  const requiredDirs = [
    '.memories',
    '.memories/decisions',
    '.claude',
    '.claude/config',
    '.claude/scripts',
    '.claude/lib'
  ];

  for (const dir of requiredDirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      addResult('pass', `Directory exists: ${dir}`);
    } else {
      addResult('fail', `Missing directory: ${dir}`, 'Run: node init-memory.js');
    }
  }
}

/**
 * Check configuration files
 */
function checkConfigFiles() {
  console.log('\n⚙️  Checking configuration files...\n');

  const configs = [
    {
      path: '.claude/config/llm-enhancement.json',
      required: false,
      validate: (content) => {
        const config = JSON.parse(content);
        return config.ollama && config.ollama.model;
      }
    },
    {
      path: '.claude/config/codebase-scan.json',
      required: false,
      validate: (content) => {
        const config = JSON.parse(content);
        return config.project_name;
      }
    }
  ];

  for (const config of configs) {
    const configPath = path.join(PROJECT_ROOT, config.path);

    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        if (config.validate && !config.validate(content)) {
          addResult('warn', `Invalid config: ${config.path}`, 'Configuration validation failed');
        } else {
          addResult('pass', `Config valid: ${config.path}`);
        }
      } catch (error) {
        addResult('fail', `Config parse error: ${config.path}`, error.message);
      }
    } else if (config.required) {
      addResult('fail', `Missing required config: ${config.path}`);
    } else {
      addResult('warn', `Missing optional config: ${config.path}`, 'Using defaults');
    }
  }
}

/**
 * Check Ollama availability
 */
async function checkOllamaAvailability() {
  console.log('\n🤖 Checking Ollama availability...\n');

  try {
    const ollamaClientPath = path.join(__dirname, '../lib/ollama-client.js');

    if (!fs.existsSync(ollamaClientPath)) {
      addResult('warn', 'Ollama client not found', 'LLM enhancement unavailable');
      return;
    }

    const OllamaClient = require(ollamaClientPath);
    const available = await OllamaClient.isAvailable();

    if (available) {
      const status = OllamaClient.getStatus();
      addResult('pass', `Ollama available: ${status.model}`, `Host: ${status.host}`);
    } else {
      addResult('warn', 'Ollama unavailable', 'Will fall back to regex-only intent analysis');
    }
  } catch (error) {
    addResult('warn', 'Could not check Ollama', error.message);
  }
}

/**
 * Check decision records
 */
function checkDecisionRecords() {
  console.log('\n📋 Checking decision records...\n');

  const decisionsDir = path.join(PROJECT_ROOT, '.memories/decisions');

  if (!fs.existsSync(decisionsDir)) {
    addResult('fail', 'Decisions directory not found');
    return;
  }

  let totalDecisions = 0;
  const domains = fs.readdirSync(decisionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const domain of domains) {
    const domainPath = path.join(decisionsDir, domain);
    const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.json'));
    totalDecisions += files.length;

    if (VERBOSE) {
      addResult('pass', `Domain '${domain}': ${files.length} decisions`);
    }
  }

  if (totalDecisions > 0) {
    addResult('pass', `Total decisions: ${totalDecisions}`, `Across ${domains.length} domains`);
  } else {
    addResult('warn', 'No decision records found', 'Consider creating decision records for key architecture decisions');
  }
}

/**
 * Check codebase map freshness
 */
function checkCodebaseMap() {
  console.log('\n🗺️  Checking codebase map...\n');

  const mapPath = path.join(PROJECT_ROOT, '.memories/codebase-map.json');
  const lastUpdatedPath = path.join(PROJECT_ROOT, '.memories/last-updated.json');

  if (!fs.existsSync(mapPath)) {
    addResult('warn', 'Codebase map not found', 'Run: node generate-codebase-map.js');
    return;
  }

  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    const lastUpdated = new Date(map.last_scan);
    const ageHours = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (ageHours < 24) {
      addResult('pass', 'Codebase map fresh', `Last updated: ${lastUpdated.toLocaleString()}`);
    } else if (ageHours < 168) {
      addResult('warn', 'Codebase map aging', `Last updated ${Math.round(ageHours)} hours ago`);
    } else {
      addResult('warn', 'Codebase map stale', 'Consider regenerating codebase map');
    }

    if (VERBOSE) {
      console.log(`      Directories scanned: ${Object.keys(map.structure || {}).length}`);
      console.log(`      Protected boundaries: ${(map.protected_boundaries || []).length}`);
    }
  } catch (error) {
    addResult('fail', 'Invalid codebase map', error.message);
  }
}

/**
 * Check script availability
 */
function checkScripts() {
  console.log('\n📜 Checking required scripts...\n');

  const scripts = [
    '.claude/scripts/decision-query.js',
    '.claude/scripts/generate-codebase-map.js',
    '.claude/lib/ollama-client.js'
  ];

  for (const script of scripts) {
    const scriptPath = path.join(PROJECT_ROOT, script);
    if (fs.existsSync(scriptPath)) {
      addResult('pass', `Script available: ${path.basename(script)}`);
    } else {
      addResult('warn', `Script missing: ${script}`);
    }
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n🚨 Critical issues found:');
    results.failed.forEach(r => {
      console.log(`   - ${r.message}`);
      if (r.details) console.log(`     ${r.details}`);
    });
  }

  if (results.warnings.length > 0 && VERBOSE) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(r => {
      console.log(`   - ${r.message}`);
      if (r.details) console.log(`     ${r.details}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed.length === 0) {
    console.log('✅ All critical checks passed!\n');
    return 0;
  } else {
    console.log('❌ Some critical checks failed. Review and fix issues above.\n');
    return 1;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Claude Memory Intelligence System - Health Check');
  console.log(`   Project: ${path.basename(PROJECT_ROOT)}`);
  console.log(`   Path: ${PROJECT_ROOT}`);

  try {
    checkDirectoryStructure();
    checkConfigFiles();
    await checkOllamaAvailability();
    checkDecisionRecords();
    checkCodebaseMap();
    checkScripts();

    const exitCode = printSummary();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkDirectoryStructure,
  checkConfigFiles,
  checkOllamaAvailability,
  checkDecisionRecords,
  checkCodebaseMap,
  checkScripts
};
