/**
 * File Tracker
 *
 * Tracks file changes and updates codebase map with:
 * - File modification tracking
 * - Directory structure monitoring
 * - Change detection
 * - Auto-update triggers
 *
 * Usage:
 *   const FileTracker = require('./file-tracker');
 *   FileTracker.trackChange('/path/to/file.ts', 'write');
 *   const changes = FileTracker.getPendingChanges();
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Find project root
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

const PROJECT_ROOT = findProjectRoot();
const TRACKER_FILE = path.join(PROJECT_ROOT, '.memories/.file-tracker.json');

/**
 * In-memory change queue
 */
let changeQueue = [];

/**
 * Load tracker state from disk
 */
function loadState() {
  if (!fs.existsSync(TRACKER_FILE)) {
    return {
      last_updated: new Date().toISOString(),
      tracked_files: {},
      pending_changes: []
    };
  }

  try {
    const content = fs.readFileSync(TRACKER_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[FileTracker] Failed to load state:', error.message);
    return {
      last_updated: new Date().toISOString(),
      tracked_files: {},
      pending_changes: []
    };
  }
}

/**
 * Save tracker state to disk
 */
function saveState(state) {
  const dir = path.dirname(TRACKER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error('[FileTracker] Failed to save state:', error.message);
    return false;
  }
}

/**
 * Calculate file hash
 */
function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  } catch (error) {
    return null;
  }
}

/**
 * Get file metadata
 */
function getFileMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      hash: calculateHash(filePath)
    };
  } catch (error) {
    return null;
  }
}

/**
 * Track a file change
 * @param {string} filePath - Absolute path to changed file
 * @param {string} operation - Type of operation (write, edit, delete)
 * @param {Object} metadata - Optional metadata
 */
function trackChange(filePath, operation = 'write', metadata = {}) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);

  // Skip if in excluded directories
  const excluded = ['node_modules', '.git', '.next', 'dist', 'build'];
  if (excluded.some(dir => relativePath.startsWith(dir))) {
    return false;
  }

  const change = {
    file: relativePath,
    absolute_path: filePath,
    operation: operation,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      ...getFileMetadata(filePath)
    }
  };

  changeQueue.push(change);
  return true;
}

/**
 * Get pending changes
 */
function getPendingChanges() {
  return [...changeQueue];
}

/**
 * Clear pending changes
 */
function clearPendingChanges() {
  changeQueue = [];
}

/**
 * Flush changes to persistent storage
 */
function flushChanges() {
  if (changeQueue.length === 0) {
    return false;
  }

  const state = loadState();
  state.pending_changes = [...state.pending_changes, ...changeQueue];
  state.last_updated = new Date().toISOString();

  const saved = saveState(state);
  if (saved) {
    clearPendingChanges();
  }

  return saved;
}

/**
 * Mark files as tracked (after codebase map update)
 */
function markTracked(filePaths) {
  const state = loadState();

  for (const filePath of filePaths) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const metadata = getFileMetadata(filePath);

    if (metadata) {
      state.tracked_files[relativePath] = {
        ...metadata,
        last_tracked: new Date().toISOString()
      };
    }
  }

  // Clear pending changes for tracked files
  state.pending_changes = state.pending_changes.filter(change =>
    !filePaths.includes(change.absolute_path)
  );

  return saveState(state);
}

/**
 * Check if file has changed since last tracking
 */
function hasChanged(filePath) {
  const state = loadState();
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const tracked = state.tracked_files[relativePath];

  if (!tracked) {
    return true; // Not tracked yet
  }

  const current = getFileMetadata(filePath);
  if (!current) {
    return true; // File deleted or inaccessible
  }

  return current.hash !== tracked.hash;
}

/**
 * Get files that need updating
 */
function getChangedFiles(directoryPath = PROJECT_ROOT, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const changedFiles = [];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(PROJECT_ROOT, fullPath);

      // Skip excluded
      const excluded = ['node_modules', '.git', '.next', 'dist', 'build', '.memories'];
      if (excluded.some(ex => relativePath.startsWith(ex))) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext) && hasChanged(fullPath)) {
          changedFiles.push(fullPath);
        }
      }
    }
  }

  scan(directoryPath);
  return changedFiles;
}

/**
 * Get statistics
 */
function getStats() {
  const state = loadState();

  return {
    tracked_files: Object.keys(state.tracked_files).length,
    pending_changes: state.pending_changes.length,
    in_memory_changes: changeQueue.length,
    last_updated: state.last_updated
  };
}

/**
 * Reset tracker (clear all state)
 */
function reset() {
  changeQueue = [];
  const state = {
    last_updated: new Date().toISOString(),
    tracked_files: {},
    pending_changes: []
  };
  return saveState(state);
}

module.exports = {
  trackChange,
  getPendingChanges,
  clearPendingChanges,
  flushChanges,
  markTracked,
  hasChanged,
  getChangedFiles,
  getStats,
  reset,
  PROJECT_ROOT
};
