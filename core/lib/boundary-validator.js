/**
 * Boundary Validator
 *
 * Validates file operations against protected boundaries with:
 * - Protected path checking
 * - Pattern matching (glob support)
 * - Violation detection
 * - Auto-blocking capabilities
 *
 * Usage:
 *   const BoundaryValidator = require('./boundary-validator');
 *   const result = BoundaryValidator.validate('/path/to/file.ts', 'write');
 *   if (!result.allowed) {
 *     console.log('Violation:', result.reason);
 *   }
 */

const fs = require('fs');
const path = require('path');
const minimatch = require('minimatch');

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

/**
 * Load protected boundaries from configuration
 */
function loadBoundaries() {
  // Try loading from codebase map first
  const codebaseMapPath = path.join(PROJECT_ROOT, '.memories/codebase-map.json');

  if (fs.existsSync(codebaseMapPath)) {
    try {
      const map = JSON.parse(fs.readFileSync(codebaseMapPath, 'utf-8'));
      if (map.protected_boundaries && Array.isArray(map.protected_boundaries)) {
        return map.protected_boundaries;
      }
    } catch (error) {
      // Fall through to config file
    }
  }

  // Try loading from config file
  const configPath = path.join(PROJECT_ROOT, '.claude/config/codebase-scan.json');

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.protected_boundaries && Array.isArray(config.protected_boundaries)) {
        return config.protected_boundaries;
      }
    } catch (error) {
      // Fall through to empty
    }
  }

  return [];
}

/**
 * Load validated boundaries from .memories/validated/
 */
function loadValidatedBoundaries() {
  const validatedDir = path.join(PROJECT_ROOT, '.memories/validated');

  if (!fs.existsSync(validatedDir)) {
    return [];
  }

  const boundaries = [];
  const files = fs.readdirSync(validatedDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(validatedDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract protected paths from markdown
      const matches = content.matchAll(/^- `([^`]+)`/gm);
      for (const match of matches) {
        boundaries.push(match[1]);
      }
    } catch (error) {
      // Skip invalid files
    }
  }

  return boundaries;
}

/**
 * Normalize path for comparison
 */
function normalizePath(filePath) {
  const relative = path.relative(PROJECT_ROOT, path.resolve(filePath));
  return relative.replace(/\\/g, '/'); // Convert to forward slashes
}

/**
 * Check if path matches pattern
 */
function matchesPattern(filePath, pattern) {
  const normalized = normalizePath(filePath);

  // Support glob patterns
  if (pattern.includes('*')) {
    return minimatch(normalized, pattern, { dot: true });
  }

  // Support exact match
  if (normalized === pattern) {
    return true;
  }

  // Support prefix match (for directories)
  if (normalized.startsWith(pattern.replace(/\/$/, '') + '/')) {
    return true;
  }

  return false;
}

/**
 * Validate file operation against boundaries
 * @param {string} filePath - Absolute or relative path to file
 * @param {string} operation - Operation type (write, edit, delete)
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validate(filePath, operation = 'write', options = {}) {
  const { strict = true, autoLoad = true } = options;

  // Load boundaries
  const configBoundaries = autoLoad ? loadBoundaries() : [];
  const validatedBoundaries = autoLoad ? loadValidatedBoundaries() : [];
  const allBoundaries = [...configBoundaries, ...validatedBoundaries];

  if (allBoundaries.length === 0) {
    return {
      allowed: true,
      reason: 'No protected boundaries defined'
    };
  }

  // Check against each boundary
  for (const boundary of allBoundaries) {
    if (matchesPattern(filePath, boundary)) {
      // Protected boundary violation
      return {
        allowed: false,
        violated: true,
        boundary: boundary,
        file: normalizePath(filePath),
        operation: operation,
        reason: `File "${normalizePath(filePath)}" matches protected boundary: ${boundary}`,
        severity: strict ? 'CRITICAL' : 'WARNING'
      };
    }
  }

  return {
    allowed: true,
    reason: 'No boundary violations detected'
  };
}

/**
 * Validate multiple files at once
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} operation - Operation type
 * @returns {Object} Validation results
 */
function validateBatch(filePaths, operation = 'write') {
  const results = {
    allowed: [],
    violations: [],
    total: filePaths.length
  };

  for (const filePath of filePaths) {
    const result = validate(filePath, operation);

    if (result.allowed) {
      results.allowed.push(filePath);
    } else {
      results.violations.push({
        file: filePath,
        ...result
      });
    }
  }

  return results;
}

/**
 * Check if a directory is protected
 */
function isProtectedDirectory(dirPath) {
  const boundaries = [...loadBoundaries(), ...loadValidatedBoundaries()];

  for (const boundary of boundaries) {
    // Remove wildcards for directory check
    const cleanBoundary = boundary.replace(/\/?\*+$/, '');

    if (matchesPattern(dirPath, cleanBoundary)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all protected paths
 */
function getProtectedPaths() {
  return {
    config: loadBoundaries(),
    validated: loadValidatedBoundaries(),
    all: [...loadBoundaries(), ...loadValidatedBoundaries()]
  };
}

/**
 * Add a protected boundary
 */
function addBoundary(pattern, toValidated = false) {
  if (toValidated) {
    // Add to validated boundaries file
    const validatedFile = path.join(PROJECT_ROOT, '.memories/validated/protected-boundaries.md');
    const dir = path.dirname(validatedFile);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content = '';
    if (fs.existsSync(validatedFile)) {
      content = fs.readFileSync(validatedFile, 'utf-8');
    } else {
      content = '# Protected Boundaries\n\n';
    }

    // Check if already exists
    if (content.includes(`\`${pattern}\``)) {
      return false; // Already exists
    }

    content += `- \`${pattern}\`\n`;
    fs.writeFileSync(validatedFile, content);
    return true;
  } else {
    // Add to config file
    const configPath = path.join(PROJECT_ROOT, '.claude/config/codebase-scan.json');

    if (!fs.existsSync(configPath)) {
      return false;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      if (!config.protected_boundaries) {
        config.protected_boundaries = [];
      }

      if (config.protected_boundaries.includes(pattern)) {
        return false; // Already exists
      }

      config.protected_boundaries.push(pattern);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('[BoundaryValidator] Failed to add boundary:', error.message);
      return false;
    }
  }
}

/**
 * CLI for testing
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    const testFile = args[args.indexOf('--test') + 1];
    if (!testFile) {
      console.log('Usage: node boundary-validator.js --test <file-path>');
      return;
    }

    const result = validate(testFile, 'write');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.includes('--list')) {
    const paths = getProtectedPaths();
    console.log('\n📋 Protected Boundaries:\n');
    console.log('Config boundaries:');
    paths.config.forEach(p => console.log(`  - ${p}`));
    console.log('\nValidated boundaries:');
    paths.validated.forEach(p => console.log(`  - ${p}`));
    return;
  }

  if (args.includes('--add')) {
    const pattern = args[args.indexOf('--add') + 1];
    const toValidated = args.includes('--validated');

    if (!pattern) {
      console.log('Usage: node boundary-validator.js --add <pattern> [--validated]');
      return;
    }

    const added = addBoundary(pattern, toValidated);
    if (added) {
      console.log(`✅ Added boundary: ${pattern}`);
    } else {
      console.log(`⚠️  Boundary already exists or failed to add: ${pattern}`);
    }
    return;
  }

  // Default: show usage
  console.log(`
Boundary Validator CLI

Usage:
  --test <file-path>        Test if file violates boundaries
  --list                    List all protected boundaries
  --add <pattern>           Add a boundary to config
  --add <pattern> --validated   Add to validated boundaries

Examples:
  node boundary-validator.js --test src/protected-core/file.ts
  node boundary-validator.js --list
  node boundary-validator.js --add "src/core/**"
  `);
}

module.exports = {
  validate,
  validateBatch,
  isProtectedDirectory,
  getProtectedPaths,
  addBoundary,
  loadBoundaries,
  loadValidatedBoundaries,
  PROJECT_ROOT
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
