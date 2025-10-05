#!/usr/bin/env node

/**
 * Issue Lifecycle Tracker - Monitor issue state changes
 *
 * Runs as background process (every 5 minutes) to:
 * - Sync GitHub state with local state
 * - Detect state transitions
 * - Send stale issue alerts
 * - Update metadata
 *
 * @module issue-tracking/lifecycle-tracker
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Load state
 */
function loadState() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

    if (!fs.existsSync(statePath)) {
      return { issues: [] };
    }

    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load state:', error.message);
    return { issues: [] };
  }
}

/**
 * Save state
 */
function saveState(state) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

    state.last_updated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save state:', error.message);
  }
}

/**
 * Calculate days since date
 */
function daysSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get recent commits
 */
function getRecentCommits(count = 10) {
  try {
    const commits = execSync(
      `git log -${count} --pretty=format:'%H|%s'`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    return commits.split('\n').map(line => {
      const [sha, message] = line.split('|');
      return { sha, message };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Detect state from GitHub issue and local context
 */
function detectState(githubIssue, localIssue) {
  // Check GitHub state first
  if (githubIssue?.state === 'closed') {
    return 'CLOSED';
  }

  // Check for in-progress markers
  const hasInProgressComment = githubIssue?.comments?.some(c =>
    c.body && (c.body.includes('working on') || c.body.includes('in progress'))
  );

  if (hasInProgressComment) {
    return 'IN_PROGRESS';
  }

  // Check for pending closure (git commits reference issue)
  const recentCommits = getRecentCommits();
  const issueNumber = githubIssue?.number || localIssue?.github_issue_number;

  const hasFixCommit = recentCommits.some(c =>
    c.message.includes(`fixes #${issueNumber}`) ||
    c.message.includes(`closes #${issueNumber}`)
  );

  if (hasFixCommit) {
    return 'PENDING_CLOSURE';
  }

  // Default to current state
  return localIssue?.status || 'OPEN';
}

/**
 * Log state transition
 */
function logStateTransition(issue, oldState, newState) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const logsDir = path.join(memoryDir, 'issue-tracking', 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}-lifecycle.log`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      issue_number: issue.github_issue_number,
      transition: `${oldState} → ${newState}`,
      trigger: 'lifecycle-tracker'
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log state transition:', error.message);
  }
}

/**
 * Send stale reminder
 */
async function sendStaleReminder(issue) {
  const daysSinceUpdate = daysSince(issue.last_updated);

  const message = `⏰ Stale Issue Alert: #${issue.github_issue_number}

**Title**: ${issue.title}
**Severity**: ${issue.severity}
**Last Updated**: ${daysSinceUpdate} days ago
**Status**: ${issue.status}

This issue has been inactive for ${daysSinceUpdate} days.

Recommended Actions:
${issue.severity === 'critical' || issue.severity === 'high' ?
  '- 🔴 URGENT: This is a high-priority issue that needs attention' :
  '- Review if this is still relevant'
}
- Add a comment with current status
- Close if no longer applicable
- Update priority if needed`;

  console.log(message);
}

/**
 * Track issue lifecycle (main entry point)
 */
async function trackIssueLifecycle() {
  const state = loadState();
  const openIssues = state.issues?.filter(i => i.status !== 'CLOSED') || [];

  console.log(`Tracking ${openIssues.length} open issues...`);

  for (const issue of openIssues) {
    try {
      // In a real implementation with MCP access, we would fetch from GitHub
      // For now, we detect state from local context
      const oldState = issue.status;
      const newState = detectState(null, issue);

      if (oldState !== newState) {
        // State transition detected
        issue.status = newState;
        issue.last_updated = new Date().toISOString();

        if (!issue.state_history) {
          issue.state_history = [];
        }

        issue.state_history.push({
          from: oldState,
          to: newState,
          timestamp: new Date().toISOString(),
          trigger: 'lifecycle-tracker'
        });

        logStateTransition(issue, oldState, newState);
        console.log(`Issue #${issue.github_issue_number}: ${oldState} → ${newState}`);
      }

      // Check for stale issues (no activity > 14 days)
      const daysSinceUpdate = daysSince(issue.last_updated);
      if (daysSinceUpdate > 14 && !issue.stale_reminder_sent) {
        await sendStaleReminder(issue);
        issue.stale_reminder_sent = true;
      }
    } catch (error) {
      console.error(`Error tracking issue #${issue.github_issue_number}:`, error.message);
    }
  }

  saveState(state);
  console.log('Lifecycle tracking complete.');
}

// Run if executed directly
if (require.main === module) {
  trackIssueLifecycle().catch(console.error);
}

module.exports = {
  trackIssueLifecycle,
  detectState,
  daysSince,
  logStateTransition,
  sendStaleReminder
};
