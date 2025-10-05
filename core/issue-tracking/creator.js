#!/usr/bin/env node

/**
 * Issue Creator - Create rich GitHub issues with context
 *
 * Creates GitHub issues using MCP server with:
 * - Rich markdown formatting
 * - Auto-labeling
 * - Context from detector
 * - Related files and decisions
 *
 * @module issue-tracking/creator
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Load configuration
 * @returns {Object} Configuration
 */
function loadConfig() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const configPath = path.join(memoryDir, 'issue-tracking', 'config.json');

    if (!fs.existsSync(configPath)) {
      // Return default config
      return {
        github: {
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          default_assignee: process.env.GITHUB_USERNAME || '',
          auto_assign: true
        },
        detection: {
          severity_thresholds: {
            auto_create_above: 'medium'
          }
        }
      };
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load config:', error.message);
    return {};
  }
}

/**
 * Load state
 * @returns {Object} State
 */
function loadState() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

    if (!fs.existsSync(statePath)) {
      return {
        version: '1.0',
        last_updated: new Date().toISOString(),
        statistics: {
          total_issues: 0,
          open_issues: 0,
          closed_issues: 0,
          auto_closed: 0,
          manual_closed: 0,
          avg_time_to_close_hours: 0,
          detection_accuracy: 0,
          deduplication_accuracy: 0
        },
        issues: []
      };
    }

    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load state:', error.message);
    return { issues: [] };
  }
}

/**
 * Save state
 * @param {Object} state - State to save
 */
function saveState(state) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const issueTrackingDir = path.join(memoryDir, 'issue-tracking');
    const statePath = path.join(issueTrackingDir, 'state.json');

    if (!fs.existsSync(issueTrackingDir)) {
      fs.mkdirSync(issueTrackingDir, { recursive: true });
    }

    state.last_updated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save state:', error.message);
  }
}

/**
 * Generate issue title from context
 * @param {Object} context - Error context
 * @returns {string} Issue title
 */
function generateTitle(context) {
  const { category, file, error_message } = context;

  // Extract first line of error
  const firstLine = error_message.split('\n')[0].trim();

  if (file) {
    return `[${category}] ${path.basename(file)}: ${firstLine.substring(0, 80)}`;
  }

  return `[${category}] ${firstLine.substring(0, 100)}`;
}

/**
 * Format issue body template
 * @param {Object} context - Error context
 * @param {Object} relatedInfo - Related issues info
 * @returns {string} Formatted issue body
 */
function formatIssueBody(context, relatedInfo = {}) {
  const {
    error_message,
    severity,
    category,
    source,
    timestamp,
    file,
    line_number,
    stack_trace,
    related_files,
    related_decisions
  } = context;

  const { relatedIssues = [], component = null } = relatedInfo;

  let body = `## 🐛 Error Detected

**Severity**: ${severity.toUpperCase()}
**Category**: ${category}
**Source**: Automatic detection via ${source}
**Detected**: ${timestamp}

---

## Error Message

\`\`\`
${error_message}
\`\`\`

## Context
`;

  if (file) {
    body += `\n- **File**: \`${file}\`${line_number ? `:${line_number}` : ''}`;
  }

  if (source) {
    body += `\n- **Detection Source**: ${source}`;
  }

  if (stack_trace) {
    body += `\n- **Stack Trace**:\n\n\`\`\`\n${stack_trace}\n\`\`\``;
  }

  if (related_files && related_files.length > 0) {
    body += `\n\n## Related Files\n\n`;
    related_files.forEach(f => {
      body += `- \`${f}\`\n`;
    });
  }

  if (related_decisions && related_decisions.length > 0) {
    body += `\n\n## Decision Intelligence\n\n`;
    related_decisions.forEach(d => {
      body += `### ${d.title || d.decision_id}\n`;
      body += `- **Decision ID**: ${d.decision_id}\n`;
      if (d.rationale) {
        body += `- **Rationale**: ${d.rationale}\n`;
      }
      if (d.migration) {
        body += `- **Migration**: ${d.migration.old_pattern} → ${d.migration.new_pattern}\n`;
      }
      body += `\n`;
    });
  } else {
    body += `\n\n## Decision Intelligence\n\nNo related decisions found.\n`;
  }

  if (relatedIssues.length > 0) {
    body += `\n\n## Related Issues\n\n`;
    body += `This issue may be related to:\n`;
    relatedIssues.forEach(issueNum => {
      body += `- #${issueNum}\n`;
    });

    if (component) {
      body += `\nAll issues affect the **${component}** component.\n`;
    }
  }

  body += `\n\n## Recommended Actions\n\n`;
  body += generateRecommendations(context);

  body += `\n\n---

**Auto-generated by PingMem Issue Tracking System**
**State File**: \`.memories/issue-tracking/issues/{issue-id}.json\`
**Configuration**: \`.memories/issue-tracking/config.json\`

<!-- ISSUE_METADATA
{
  "internal_id": "${uuidv4()}",
  "created_by": "issue-tracker",
  "detection_method": "${source}",
  "severity": "${severity}",
  "category": "${category}"
}
-->
`;

  return body;
}

/**
 * Generate recommended actions based on context
 * @param {Object} context - Error context
 * @returns {string} Recommendations
 */
function generateRecommendations(context) {
  const { category, severity, file } = context;

  let recommendations = '';

  switch (category) {
    case 'type-error':
      recommendations = `1. Review TypeScript errors in \`${file}\`
2. Run \`npm run typecheck\` to verify fix
3. Check related type definitions
4. Ensure all imports are properly typed`;
      break;

    case 'test-failure':
      recommendations = `1. Review test failures in \`${file}\`
2. Run \`npm test\` to reproduce locally
3. Check test fixtures and mocks
4. Verify test assertions are correct`;
      break;

    case 'runtime-error':
      recommendations = `1. Review stack trace for root cause
2. Add error handling/try-catch blocks
3. Check input validation
4. Add logging for debugging`;
      break;

    case 'protected-core':
      recommendations = `⚠️ **CRITICAL**: Protected-core violation detected!

1. **DO NOT** modify files in \`protected-core/\`
2. Review \`.memories/validated/protected-core-boundaries.md\`
3. Use service contracts instead
4. Consult architecture documentation`;
      break;

    case 'code-quality':
      recommendations = `1. Run \`npm run lint\` to see all issues
2. Fix linting errors automatically: \`npm run lint:fix\`
3. Review code style guidelines
4. Consider using Prettier for formatting`;
      break;

    default:
      recommendations = `1. Review the error message and stack trace
2. Check related files and dependencies
3. Run relevant test suite
4. Consult documentation or team`;
  }

  if (severity === 'critical') {
    recommendations = `🔴 **URGENT**: This is a critical issue that requires immediate attention!\n\n${recommendations}`;
  }

  return recommendations;
}

/**
 * Create GitHub issue using MCP server
 * @param {Object} context - Error context
 * @param {Object} relatedInfo - Related issues info
 * @returns {Promise<Object>} Created issue
 */
async function createGitHubIssue(context, relatedInfo = {}) {
  const config = loadConfig();

  if (!config.github?.owner || !config.github?.repo) {
    throw new Error('GitHub configuration missing. Please set GITHUB_OWNER and GITHUB_REPO.');
  }

  const title = generateTitle(context);
  const body = formatIssueBody(context, relatedInfo);

  // Note: This would be called by Claude Code with MCP server access
  // For standalone use, this is a placeholder
  const issueData = {
    owner: config.github.owner,
    repo: config.github.repo,
    title,
    body,
    labels: context.labels || ['bug', 'auto-detected'],
    assignees: config.github.auto_assign ? [config.github.default_assignee] : []
  };

  return {
    ...issueData,
    internal_id: uuidv4(),
    created_at: new Date().toISOString()
  };
}

/**
 * Save issue metadata
 * @param {number|string} issueNumber - GitHub issue number or internal ID
 * @param {Object} context - Error context
 */
function saveIssueMetadata(issueNumber, context) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const issuesDir = path.join(memoryDir, 'issue-tracking', 'issues');

    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }

    const metadataPath = path.join(issuesDir, `${issueNumber}.json`);

    const metadata = {
      ...context,
      github_issue_number: issueNumber,
      internal_id: context.internal_id || uuidv4(),
      created_at: context.created_at || new Date().toISOString(),
      last_updated: new Date().toISOString(),
      status: 'OPEN',
      state_history: [
        {
          from: null,
          to: 'OPEN',
          timestamp: new Date().toISOString(),
          trigger: 'issue-creator'
        }
      ],
      reminders: {
        stale_reminder_sent: false,
        last_reminder_sent: null
      },
      closure_attempts: []
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return metadata;
  } catch (error) {
    console.error('Failed to save issue metadata:', error.message);
    throw error;
  }
}

/**
 * Update state with new issue
 * @param {Object} issue - Created issue
 */
function updateState(issue) {
  const state = loadState();

  state.issues.push({
    internal_id: issue.internal_id,
    github_issue_number: issue.number || issue.github_issue_number,
    title: issue.title,
    status: 'OPEN',
    severity: issue.severity,
    category: issue.category,
    labels: issue.labels,
    created_at: issue.created_at,
    last_updated: new Date().toISOString(),
    detection_method: issue.source,
    confidence: issue.confidence || 0.98
  });

  state.statistics.total_issues += 1;
  state.statistics.open_issues += 1;

  saveState(state);
}

/**
 * Log issue creation
 * @param {Object} issue - Created issue
 */
function logCreation(issue) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const logsDir = path.join(memoryDir, 'issue-tracking', 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}-creations.log`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      github_issue_number: issue.number || issue.github_issue_number,
      internal_id: issue.internal_id,
      title: issue.title,
      severity: issue.severity,
      category: issue.category
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log creation:', error.message);
  }
}

/**
 * Create issue (main entry point)
 * @param {Object} context - Error context from detector
 * @param {Object} relatedInfo - Related issues from deduplicator
 * @returns {Promise<Object>} Created issue
 */
async function createIssue(context, relatedInfo = {}) {
  try {
    // Create GitHub issue
    const issue = await createGitHubIssue(context, relatedInfo);

    // Save metadata
    const metadata = saveIssueMetadata(
      issue.number || issue.internal_id,
      {
        ...context,
        ...issue,
        github_url: issue.html_url
      }
    );

    // Update state
    updateState({
      ...issue,
      ...metadata
    });

    // Log creation
    logCreation(issue);

    return issue;
  } catch (error) {
    console.error('Failed to create issue:', error.message);
    throw error;
  }
}

module.exports = {
  createIssue,
  createGitHubIssue,
  saveIssueMetadata,
  updateState,
  generateTitle,
  formatIssueBody,
  generateRecommendations,
  logCreation
};
