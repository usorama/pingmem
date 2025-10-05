#!/usr/bin/env node

/**
 * PostToolUse Hook - Memory Update
 * Project-Agnostic Memory Intelligence System
 *
 * AUTO-UPDATES memory system after EVERY file write/edit operation
 * Ensures codebase-map.json and last-updated.json are always current
 * Also triggers file-level scanning for code file changes
 *
 * Triggers: After Write, Edit, MultiEdit, NotebookEdit tool use
 * Latency: <100ms per update (folder-level), <500ms (file-level)
 *
 * Works with ANY project type: Next.js, React, Python, Go, Rust, Java, etc.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const configLoader = require('../lib/config-loader');
const config = configLoader.loadConfig();

// Paths (from config)
const PROJECT_ROOT = config.project.root;
const MEMORY_DIR = config.project.memoryDir;
const CODEBASE_MAP_PATH = configLoader.getCodebaseMapPath(config);
const FILE_LEVEL_MAP_PATH = configLoader.getFileLevelMapPath(config);
const LAST_UPDATED_PATH = configLoader.getLastUpdatedPath(config);
const FILE_LEVEL_SCANNER = path.join(__dirname, '../scripts/generate-file-level-map.js');

// File operation tools that should trigger updates (from config)
const UPDATE_TRIGGERS = config.memory.updateTriggers || ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

/**
 * Check if memory system is initialized
 * @returns {boolean}
 */
function isMemoryInitialized() {
  return fs.existsSync(MEMORY_DIR) &&
         fs.existsSync(CODEBASE_MAP_PATH) &&
         fs.existsSync(LAST_UPDATED_PATH);
}

/**
 * Update last-updated.json timestamp
 * @param {string} trigger - Tool name that triggered the update
 * @param {string} filePath - File that was modified
 */
function updateTimestamp(trigger, filePath) {
  const timestamp = {
    last_updated: new Date().toISOString(),
    trigger: trigger,
    file_modified: filePath || null
  };

  fs.writeFileSync(LAST_UPDATED_PATH, JSON.stringify(timestamp, null, 2), 'utf-8');
}

/**
 * Update codebase map with file change
 * @param {string} filePath - File that was modified
 * @param {string} operation - Operation performed (write, edit, etc.)
 */
function updateCodebaseMap(filePath, operation) {
  if (!fs.existsSync(CODEBASE_MAP_PATH)) {
    if (process.env.CLAUDE_DEBUG) {
      console.warn('⚠️  Codebase map not found, skipping update');
    }
    return;
  }

  try {
    const map = JSON.parse(fs.readFileSync(CODEBASE_MAP_PATH, 'utf-8'));

    // Update recent_changes
    if (!map.recent_changes) {
      map.recent_changes = [];
    }

    map.recent_changes.unshift({
      timestamp: new Date().toISOString(),
      file: filePath,
      operation: operation
    });

    // Keep only last 20 changes
    if (map.recent_changes.length > 20) {
      map.recent_changes = map.recent_changes.slice(0, 20);
    }

    // Update last_scan
    map.last_scan = new Date().toISOString();

    fs.writeFileSync(CODEBASE_MAP_PATH, JSON.stringify(map, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error updating codebase map:', error.message);
  }
}

/**
 * Log change for git commit
 * @param {string} toolName - Name of the tool used
 * @param {string} filePath - File that was modified
 */
function logChange(toolName, filePath) {
  const logFile = path.join(MEMORY_DIR, '.pending-changes.log');
  const logEntry = `${new Date().toISOString()}|${toolName}|${filePath}\n`;

  try {
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (error) {
    // Silent failure - log file is optional
  }
}

/**
 * Check if file is a code file that needs file-level analysis
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function isCodeFile(filePath) {
  if (!config.memory.scanCodeFiles) {
    return false;
  }

  // Get code extensions from config
  const codeExtensions = config.memory.codeExtensions || ['.ts', '.tsx', '.js', '.jsx', '.py', '.md'];
  const ext = path.extname(filePath).toLowerCase();

  // Check if it's a code extension
  if (!codeExtensions.includes(ext)) {
    return false;
  }

  // Exclude certain directories (from config)
  const excludeDirs = config.boundaries.excluded || [
    'node_modules', '.next', 'dist', 'build', '.git', 'coverage',
    'target', 'bin', 'obj', '__pycache__', 'venv', '.venv'
  ];

  const relativePath = path.relative(PROJECT_ROOT, filePath);

  for (const excludeDir of excludeDirs) {
    const normalizedExclude = excludeDir.replace(/\*\*/g, '').replace(/\*/g, '');
    if (relativePath.includes(normalizedExclude + path.sep) ||
        relativePath.startsWith(normalizedExclude + path.sep)) {
      return false;
    }
  }

  return true;
}

/**
 * Trigger file-level scan (async background process)
 */
function triggerFileLevelScan() {
  if (!config.memory.fileLevelScanning) {
    return;
  }

  if (!fs.existsSync(FILE_LEVEL_SCANNER)) {
    if (process.env.CLAUDE_DEBUG) {
      console.warn('⚠️  File-level scanner not found, skipping');
    }
    return;
  }

  try {
    // Run scanner in background (non-blocking)
    if (config.memory.backgroundScanning) {
      const { spawn } = require('child_process');

      const scanner = spawn('node', [FILE_LEVEL_SCANNER], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: 'ignore'
      });

      scanner.unref(); // Allow parent process to exit
    } else {
      // Run synchronously (blocking - useful for testing)
      const { execSync } = require('child_process');
      execSync(`node "${FILE_LEVEL_SCANNER}"`, {
        cwd: PROJECT_ROOT,
        stdio: 'ignore'
      });
    }
  } catch (error) {
    if (process.env.CLAUDE_DEBUG) {
      console.error('❌ Failed to trigger file-level scan:', error.message);
    }
  }
}

/**
 * Main hook handler
 * @param {string} toolName - Name of the tool that was used
 * @param {Object} args - Arguments passed to the tool
 * @param {Object} result - Result from the tool execution
 */
function handlePostToolUse(toolName, args, result) {
  // Check if hook is enabled
  if (!config.hooks.postToolUse.enabled || !config.memory.autoUpdate) {
    return;
  }

  // Only process file operation tools
  if (!UPDATE_TRIGGERS.includes(toolName)) {
    return;
  }

  // Check if memory is initialized
  if (!isMemoryInitialized()) {
    if (process.env.CLAUDE_DEBUG) {
      console.warn('⚠️  Memory system not initialized. Run the setup script first.');
    }
    return;
  }

  // Extract file path from args
  let filePath = args.file_path || args.path || args.notebook_path || null;

  if (!filePath) {
    return; // No file path, skip
  }

  // Update memory system
  try {
    updateTimestamp(toolName, filePath);
    updateCodebaseMap(filePath, toolName.toLowerCase());
    logChange(toolName, filePath);

    // If it's a code file, trigger file-level scan (background)
    if (isCodeFile(filePath)) {
      triggerFileLevelScan();
    }

    // Silent success (no output to avoid cluttering terminal)
  } catch (error) {
    console.error('❌ Memory update failed:', error.message);
  }
}

/**
 * CLI interface for testing
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node post-tool-use.js <tool> <file_path>');
    process.exit(1);
  }

  const [toolName, filePath] = args;

  handlePostToolUse(toolName, { file_path: filePath }, {});
  console.log('✅ Memory updated');
}

// Run if called directly (for testing)
if (require.main === module) {
  main();
}

module.exports = { handlePostToolUse };
