#!/usr/bin/env node

/**
 * Issue Manager - Orchestration layer for issue tracking system
 *
 * Provides unified API for:
 * - Detecting issues
 * - Checking duplicates
 * - Creating issues
 * - Tracking lifecycle
 * - Sending reminders
 * - Auto-closing issues
 *
 * @module issue-tracking/manager
 */

const { detectIssue, logDetection } = require('./detector');
const { checkDuplicate, logDeduplication } = require('./deduplicator');
const { createIssue } = require('./creator');
const { trackIssueLifecycle } = require('./lifecycle-tracker');
const { sendDailySummary, sendWeeklyDigest } = require('./reminder');
const { autoCloseIssue, processCommitMessage } = require('./auto-closer');

/**
 * Process a new error (complete workflow)
 * @param {Object} options - Error detection options
 * @returns {Promise<Object|null>} Created issue or null if duplicate/skipped
 */
async function processError(options) {
  try {
    // Step 1: Detect issue
    console.log('Step 1: Detecting issue...');
    const context = await detectIssue(options);

    if (!context) {
      console.log('No issue detected (not an error report).');
      return null;
    }

    logDetection(context);
    console.log(`Issue detected: ${context.severity} - ${context.category}`);

    // Step 2: Check for duplicates
    console.log('Step 2: Checking for duplicates...');
    const dupResult = await checkDuplicate(context);

    logDeduplication(context, dupResult);

    if (dupResult.isDuplicate) {
      console.log(`Duplicate issue found: #${dupResult.matchedIssue.github_issue_number} (${dupResult.method}, confidence: ${(dupResult.confidence * 100).toFixed(1)}%)`);
      return null;
    }

    console.log('No duplicate found. Creating new issue...');

    // Step 3: Create issue
    const relatedInfo = {
      relatedIssues: dupResult.relatedIssues || [],
      component: dupResult.component
    };

    const issue = await createIssue(context, relatedInfo);

    console.log(`✅ Issue created: #${issue.github_issue_number || issue.internal_id}`);
    console.log(`   Title: ${issue.title}`);
    console.log(`   Severity: ${context.severity}`);
    console.log(`   Category: ${context.category}`);

    return issue;
  } catch (error) {
    console.error('Error processing issue:', error.message);
    throw error;
  }
}

/**
 * Handle post-tool-use hook error
 * @param {Object} toolResult - Tool execution result
 * @param {string} toolName - Tool name
 * @returns {Promise<Object|null>} Created issue or null
 */
async function handlePostToolUseError(toolResult, toolName) {
  if (!toolResult?.error && !toolResult?.stderr) {
    return null;
  }

  const error = toolResult.error || toolResult.stderr;

  return await processError({
    error,
    source: 'posttooluse',
    tool: toolName,
    file: toolResult.file_path,
    additionalContext: {
      tool_args: toolResult.args
    }
  });
}

/**
 * Handle user prompt issue report
 * @param {string} prompt - User prompt
 * @param {Object} intent - Intent analysis result
 * @returns {Promise<Object|null>} Created issue or null
 */
async function handleUserPromptIssue(prompt, intent = null) {
  return await processError({
    error: prompt,
    source: 'userprompt',
    prompt,
    intent,
    additionalContext: {
      user_reported: true
    }
  });
}

/**
 * Handle git commit (auto-closure)
 * @returns {Promise<void>}
 */
async function handleGitCommit() {
  try {
    await processCommitMessage();
  } catch (error) {
    console.error('Error handling git commit:', error.message);
  }
}

/**
 * Run daily maintenance
 * @returns {Promise<void>}
 */
async function runDailyMaintenance() {
  try {
    console.log('Running daily maintenance...');

    // Track lifecycle
    await trackIssueLifecycle();

    // Send daily summary
    await sendDailySummary();

    console.log('Daily maintenance complete.');
  } catch (error) {
    console.error('Error running daily maintenance:', error.message);
  }
}

/**
 * Run weekly maintenance
 * @returns {Promise<void>}
 */
async function runWeeklyMaintenance() {
  try {
    console.log('Running weekly maintenance...');

    // Track lifecycle
    await trackIssueLifecycle();

    // Send weekly digest
    await sendWeeklyDigest();

    console.log('Weekly maintenance complete.');
  } catch (error) {
    console.error('Error running weekly maintenance:', error.message);
  }
}

/**
 * Manual issue creation
 * @param {Object} options - Issue options
 * @returns {Promise<Object>} Created issue
 */
async function createManualIssue(options) {
  const {
    title,
    description,
    severity = 'medium',
    category = 'user-reported',
    file = null,
    labels = []
  } = options;

  const context = {
    error_message: description,
    source: 'manual',
    timestamp: new Date().toISOString(),
    severity,
    category,
    file,
    labels: [...labels, 'manual', 'auto-detected'],
    related_files: [],
    related_decisions: []
  };

  // Check duplicates
  const dupResult = await checkDuplicate(context);

  if (dupResult.isDuplicate) {
    console.log(`Duplicate issue found: #${dupResult.matchedIssue.github_issue_number}`);
    return dupResult.matchedIssue;
  }

  const issue = await createIssue(context, {
    relatedIssues: dupResult.relatedIssues || []
  });

  console.log(`✅ Manual issue created: #${issue.github_issue_number || issue.internal_id}`);

  return issue;
}

/**
 * Close issue manually
 * @param {number} issueNumber - GitHub issue number
 * @param {string} comment - Closure comment
 * @returns {Promise<boolean>} Success
 */
async function closeManualIssue(issueNumber, comment = null) {
  const fs = require('fs');
  const path = require('path');

  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

    if (!fs.existsSync(statePath)) {
      console.error('State file not found.');
      return false;
    }

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const issueIndex = state.issues?.findIndex(i => i.github_issue_number === issueNumber);

    if (issueIndex === -1) {
      console.error(`Issue #${issueNumber} not found.`);
      return false;
    }

    state.issues[issueIndex].status = 'CLOSED';
    state.issues[issueIndex].closed_at = new Date().toISOString();
    state.issues[issueIndex].closed_by = 'manual';

    if (comment) {
      state.issues[issueIndex].closure_comment = comment;
    }

    state.statistics = state.statistics || {};
    state.statistics.closed_issues = (state.statistics.closed_issues || 0) + 1;
    state.statistics.manual_closed = (state.statistics.manual_closed || 0) + 1;
    state.statistics.open_issues = Math.max(0, (state.statistics.open_issues || 0) - 1);

    state.last_updated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    console.log(`✅ Issue #${issueNumber} closed manually.`);
    return true;
  } catch (error) {
    console.error('Error closing issue:', error.message);
    return false;
  }
}

module.exports = {
  processError,
  handlePostToolUseError,
  handleUserPromptIssue,
  handleGitCommit,
  runDailyMaintenance,
  runWeeklyMaintenance,
  createManualIssue,
  closeManualIssue
};
