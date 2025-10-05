/**
 * Configuration Loader for Memory Intelligence System
 *
 * Loads project-specific configuration from .memory-config.json
 * Falls back to sensible defaults for any project type
 */

const fs = require('fs');
const path = require('path');

/**
 * Default configuration (works for any project)
 */
const DEFAULT_CONFIG = {
  // Project paths
  project: {
    root: process.cwd(),
    memoryDir: '.memories',
    decisionsSubdir: 'decisions',
    validatedSubdir: 'validated'
  },

  // Protected boundaries (customizable per project)
  boundaries: {
    protected: [],  // e.g., ['src/protected-core/**', 'src/core/**']
    excluded: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**']
  },

  // Workflow configuration
  workflow: {
    storyPattern: null,  // e.g., 'PC-014-*' for PingLearn, 'STORY-*' for others
    manifestPath: null,  // e.g., '.research-plan-manifests'
    evidenceDir: 'docs/evidence',  // Where to find evidence files
    requireResearch: false,  // Enforce research phase before implementation
    requirePlan: false  // Enforce planning phase before implementation
  },

  // Decision Intelligence configuration
  decisionIntelligence: {
    enabled: true,
    categories: ['architecture', 'database', 'api', 'ui', 'infrastructure', 'auth'],
    domains: ['architecture', 'database', 'api', 'ui', 'infrastructure', 'auth'],
    confidenceThreshold: 0.8,
    deprecationTracking: true
  },

  // Memory update behavior
  memory: {
    autoUpdate: true,
    updateTriggers: ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'],
    scanCodeFiles: true,
    codeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.md'],
    fileLevelScanning: true,
    backgroundScanning: true
  },

  // Intent analysis configuration
  intent: {
    llmEnhancement: true,  // Use LLM for better intent detection
    regexFallback: true,   // Always use regex as baseline
    contextInjection: true,  // Auto-inject decision context into prompts
    confidenceThreshold: 0.7
  },

  // Hook behavior
  hooks: {
    userPromptSubmit: {
      enabled: true,
      injectContext: true
    },
    postToolUse: {
      enabled: true,
      autoUpdate: true
    },
    decisionCapture: {
      enabled: true,
      autoExtract: true
    }
  }
};

/**
 * Load configuration from project root
 * @param {string} projectRoot - Optional project root path
 * @returns {Object} Merged configuration
 */
function loadConfig(projectRoot = null) {
  const root = projectRoot || process.cwd();
  const configPath = path.join(root, '.memory-config.json');

  let userConfig = {};

  // Try to load user config
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to load .memory-config.json: ${error.message}`);
      console.warn('⚠️  Using default configuration');
    }
  }

  // Deep merge user config with defaults
  const config = deepMerge(DEFAULT_CONFIG, userConfig);

  // Resolve paths to absolute
  config.project.root = path.resolve(root);
  config.project.memoryDir = path.resolve(root, config.project.memoryDir);

  if (config.workflow.manifestPath) {
    config.workflow.manifestPath = path.resolve(root, config.workflow.manifestPath);
  }

  if (config.workflow.evidenceDir) {
    config.workflow.evidenceDir = path.resolve(root, config.workflow.evidenceDir);
  }

  return config;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if value is an object
 * @param {*} item - Value to check
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get path to decisions directory
 * @param {Object} config - Configuration object
 * @returns {string} Absolute path to decisions directory
 */
function getDecisionsDir(config) {
  return path.join(config.project.memoryDir, config.project.decisionsSubdir);
}

/**
 * Get path to validated directory
 * @param {Object} config - Configuration object
 * @returns {string} Absolute path to validated directory
 */
function getValidatedDir(config) {
  return path.join(config.project.memoryDir, config.project.validatedSubdir);
}

/**
 * Get path to codebase map
 * @param {Object} config - Configuration object
 * @returns {string} Absolute path to codebase-map.json
 */
function getCodebaseMapPath(config) {
  return path.join(config.project.memoryDir, 'codebase-map.json');
}

/**
 * Get path to file-level codebase map
 * @param {Object} config - Configuration object
 * @returns {string} Absolute path to codebase-map-files.json
 */
function getFileLevelMapPath(config) {
  return path.join(config.project.memoryDir, 'codebase-map-files.json');
}

/**
 * Get path to last-updated.json
 * @param {Object} config - Configuration object
 * @returns {string} Absolute path to last-updated.json
 */
function getLastUpdatedPath(config) {
  return path.join(config.project.memoryDir, 'last-updated.json');
}

/**
 * Generate template configuration file
 * @param {string} outputPath - Path to write config file
 */
function generateTemplate(outputPath) {
  const template = {
    _comment: "Memory Intelligence System Configuration",
    _instructions: [
      "Copy this file to your project root as .memory-config.json",
      "Customize settings based on your project needs",
      "All paths are relative to project root unless absolute"
    ],
    ...DEFAULT_CONFIG
  };

  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`✅ Template configuration written to: ${outputPath}`);
}

module.exports = {
  loadConfig,
  getDecisionsDir,
  getValidatedDir,
  getCodebaseMapPath,
  getFileLevelMapPath,
  getLastUpdatedPath,
  generateTemplate,
  DEFAULT_CONFIG
};
