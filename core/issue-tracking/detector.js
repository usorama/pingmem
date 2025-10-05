#!/usr/bin/env node

/**
 * Issue Detector - Automated error detection and context extraction
 *
 * Detects errors from multiple sources:
 * - PostToolUse Hook (file operations)
 * - UserPromptSubmit Hook (user-reported issues)
 * - Git Commit Hook (test failures)
 * - CLI (manual issue creation)
 *
 * @module issue-tracking/detector
 */

const fs = require('fs');
const path = require('path');

/**
 * Error pattern matching with severity classification
 */
const ERROR_PATTERNS = {
  typescript: {
    pattern: /error TS\d+:/i,
    severity: 'high',
    category: 'type-error',
    labels: ['bug', 'typescript', 'auto-detected']
  },
  test_failure: {
    pattern: /(FAIL|Error:|AssertionError)/i,
    severity: 'high',
    category: 'test-failure',
    labels: ['bug', 'testing', 'auto-detected']
  },
  runtime_error: {
    pattern: /(Error|Exception|Fatal|Crash)/i,
    severity: 'critical',
    category: 'runtime-error',
    labels: ['bug', 'critical', 'auto-detected']
  },
  protected_core_violation: {
    pattern: /protected-core/i,
    severity: 'critical',
    category: 'architecture',
    labels: ['bug', 'critical', 'protected-core', 'auto-detected']
  },
  lint_error: {
    pattern: /(eslint|prettier).*error/i,
    severity: 'medium',
    category: 'code-quality',
    labels: ['enhancement', 'code-quality', 'auto-detected']
  },
  user_reported: {
    pattern: /(broken|error|issue|bug|not working|failing)/i,
    severity: 'medium',
    category: 'user-reported',
    labels: ['question', 'needs-triage', 'user-reported']
  }
};

/**
 * Severity classification based on context
 * @param {Object} context - Error context
 * @returns {string} Severity level (critical|high|medium|low)
 */
function classifySeverity(context) {
  const { error, file, stackTrace } = context;

  // Critical: Protected core violations, runtime crashes
  if (error.includes('protected-core') || error.includes('Fatal')) {
    return 'critical';
  }

  // High: TypeScript errors, test failures, blocking issues
  if (error.includes('TS') || error.includes('FAIL')) {
    return 'high';
  }

  // Medium: Lint errors, warnings, user-reported issues
  if (error.includes('eslint') || context.source === 'userprompt') {
    return 'medium';
  }

  // Low: Everything else
  return 'low';
}

/**
 * Extract file path and line number from error message
 * @param {string} error - Error message
 * @returns {Object} File info
 */
function extractFileInfo(error) {
  // Match patterns like: file.ts:42, src/file.js:10:5, etc.
  const fileMatch = error.match(/([^\s]+\.(ts|tsx|js|jsx|py|md))(?::(\d+))?(?::(\d+))?/);

  if (fileMatch) {
    return {
      file: fileMatch[1],
      line_number: fileMatch[3] ? parseInt(fileMatch[3]) : null,
      column_number: fileMatch[4] ? parseInt(fileMatch[4]) : null
    };
  }

  return { file: null, line_number: null, column_number: null };
}

/**
 * Extract stack trace from error message
 * @param {string} error - Error message
 * @returns {string} Stack trace
 */
function extractStackTrace(error) {
  const stackLines = error.split('\n').filter(line =>
    line.includes('at ') || line.includes('→') || line.includes('  in ')
  );
  return stackLines.join('\n');
}

/**
 * Find related files using codebase map
 * @param {string} file - Primary file path
 * @returns {Promise<string[]>} Related file paths
 */
async function findRelatedFiles(file) {
  if (!file) return [];

  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const codebaseMapPath = path.join(memoryDir, 'codebase-map.json');

    if (!fs.existsSync(codebaseMapPath)) {
      return [];
    }

    const codebaseMap = JSON.parse(fs.readFileSync(codebaseMapPath, 'utf-8'));

    // Find the file in the map
    const fileEntry = codebaseMap.files?.find(f => f.path.endsWith(file));

    if (!fileEntry) return [];

    // Get related files (imports, exports, tests)
    const related = [];

    // Add imported files
    if (fileEntry.imports) {
      related.push(...fileEntry.imports);
    }

    // Add test files
    if (fileEntry.test_file) {
      related.push(fileEntry.test_file);
    }

    return [...new Set(related)].slice(0, 5); // Max 5 related files
  } catch (error) {
    console.error('Error finding related files:', error.message);
    return [];
  }
}

/**
 * Query decision intelligence for related decisions
 * @param {Object} context - Error context
 * @returns {Promise<Array>} Related decisions
 */
async function queryRelatedDecisions(context) {
  try {
    const decisionQueryPath = path.join(__dirname, '../scripts/decision-query.js');

    if (!fs.existsSync(decisionQueryPath)) {
      return [];
    }

    const { queryDecisions } = require(decisionQueryPath);

    const decisions = [];

    // Query by file
    if (context.file) {
      const fileDecisions = await queryDecisions({ file: context.file });
      decisions.push(...fileDecisions);
    }

    // Query by domain (extracted from file path)
    if (context.file) {
      const domain = extractDomain(context.file);
      if (domain) {
        const domainDecisions = await queryDecisions({ domain });
        decisions.push(...domainDecisions);
      }
    }

    // Remove duplicates
    const uniqueDecisions = decisions.filter((decision, index, self) =>
      index === self.findIndex(d => d.decision_id === decision.decision_id)
    );

    return uniqueDecisions.slice(0, 3); // Max 3 related decisions
  } catch (error) {
    console.error('Error querying related decisions:', error.message);
    return [];
  }
}

/**
 * Extract domain from file path
 * @param {string} filePath - File path
 * @returns {string|null} Domain
 */
function extractDomain(filePath) {
  if (!filePath) return null;

  const parts = filePath.split('/');

  // Common domain patterns
  const domains = {
    auth: /auth|authentication|login|session/i,
    api: /api|endpoint|route/i,
    database: /db|database|schema|model/i,
    ui: /ui|component|view|page/i,
    testing: /test|spec|e2e/i
  };

  for (const [domain, pattern] of Object.entries(domains)) {
    if (pattern.test(filePath)) {
      return domain;
    }
  }

  return null;
}

/**
 * Detect issue category from error pattern
 * @param {string} error - Error message
 * @returns {Object} Pattern match result
 */
function detectPattern(error) {
  for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.pattern.test(error)) {
      return {
        type,
        severity: pattern.severity,
        category: pattern.category,
        labels: pattern.labels
      };
    }
  }

  // Default pattern for unknown errors
  return {
    type: 'unknown',
    severity: 'medium',
    category: 'unknown',
    labels: ['bug', 'needs-triage', 'auto-detected']
  };
}

/**
 * Extract context from error
 * @param {string} error - Error message
 * @param {string} source - Detection source
 * @param {Object} additionalContext - Additional context
 * @returns {Promise<Object>} Error context
 */
async function extractContext(error, source, additionalContext = {}) {
  const fileInfo = extractFileInfo(error);
  const pattern = detectPattern(error);

  const context = {
    error_message: error,
    source, // 'posttooluse', 'userprompt', 'git', 'manual'
    timestamp: new Date().toISOString(),
    file: fileInfo.file,
    line_number: fileInfo.line_number,
    column_number: fileInfo.column_number,
    stack_trace: extractStackTrace(error),
    related_files: [],
    related_decisions: [],
    severity: pattern.severity,
    category: pattern.category,
    labels: pattern.labels,
    ...additionalContext
  };

  // Find related files
  if (context.file) {
    context.related_files = await findRelatedFiles(context.file);
  }

  // Query decision intelligence
  context.related_decisions = await queryRelatedDecisions(context);

  return context;
}

/**
 * Detect issue from error
 * @param {Object} options - Detection options
 * @returns {Promise<Object|null>} Detected issue context or null
 */
async function detectIssue(options) {
  const {
    error,
    source = 'manual',
    file,
    tool,
    prompt,
    intent,
    additionalContext = {}
  } = options;

  if (!error && !prompt) {
    throw new Error('Either error or prompt must be provided');
  }

  // For user prompts, check if it's actually reporting an issue
  if (source === 'userprompt' && prompt) {
    const hasIssueKeywords = ERROR_PATTERNS.user_reported.pattern.test(prompt);

    if (!hasIssueKeywords) {
      return null; // Not an issue report
    }

    // Use the prompt as the error message
    const context = await extractContext(prompt, source, {
      file,
      prompt,
      intent,
      ...additionalContext
    });

    return context;
  }

  // For other sources, extract context from error
  const context = await extractContext(error, source, {
    file,
    tool,
    ...additionalContext
  });

  return context;
}

/**
 * Log detection event
 * @param {Object} context - Error context
 */
function logDetection(context) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const logsDir = path.join(memoryDir, 'issue-tracking', 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}-detections.log`);

    const logEntry = {
      timestamp: context.timestamp,
      source: context.source,
      severity: context.severity,
      category: context.category,
      file: context.file,
      error_preview: context.error_message.substring(0, 100)
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log detection:', error.message);
  }
}

module.exports = {
  detectIssue,
  extractContext,
  classifySeverity,
  extractFileInfo,
  extractStackTrace,
  findRelatedFiles,
  queryRelatedDecisions,
  logDetection,
  ERROR_PATTERNS
};
