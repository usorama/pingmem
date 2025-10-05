#!/usr/bin/env node

/**
 * Issue Reminder Engine - Send periodic notifications
 *
 * Notification types:
 * - Daily summary (9:00 AM if issues > 0)
 * - Weekly digest (Monday 9:00 AM)
 * - Stale alerts (14+ days inactive)
 *
 * @module issue-tracking/reminder
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadState() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');
    if (!fs.existsSync(statePath)) return { issues: [] };
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (error) {
    return { issues: [] };
  }
}

function loadConfig() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const configPath = path.join(memoryDir, 'issue-tracking', 'config.json');
    if (!fs.existsSync(configPath)) return { reminders: { delivery_methods: ['terminal', 'file'] } };
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    return { reminders: { delivery_methods: ['terminal', 'file'] } };
  }
}

function calculateAvgTimeToClose(closedIssues) {
  if (closedIssues.length === 0) return 'N/A';

  const totalHours = closedIssues.reduce((sum, issue) => {
    const created = new Date(issue.created_at);
    const closed = new Date(issue.closed_at);
    const hours = (closed - created) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  const avgHours = totalHours / closedIssues.length;
  return `${avgHours.toFixed(1)} hours`;
}

function generateDailySummary(state) {
  const openIssues = state.issues?.filter(i => i.status !== 'CLOSED') || [];
  if (openIssues.length === 0) return null;

  const critical = openIssues.filter(i => i.severity === 'critical');
  const high = openIssues.filter(i => i.severity === 'high');
  const medium = openIssues.filter(i => i.severity === 'medium');
  const low = openIssues.filter(i => i.severity === 'low');

  return `📋 PingMem Daily Issue Summary (${new Date().toLocaleDateString()})

Total Open Issues: ${openIssues.length}
├─ 🔴 Critical: ${critical.length}
├─ 🟠 High: ${high.length}
├─ 🟡 Medium: ${medium.length}
└─ 🟢 Low: ${low.length}

${critical.length > 0 ? `
⚠️  CRITICAL ISSUES (Requires Immediate Attention):
${critical.map(i => `  • #${i.github_issue_number}: ${i.title}`).join('\n')}
` : ''}

${high.length > 0 ? `
🔥 HIGH PRIORITY:
${high.slice(0, 3).map(i => `  • #${i.github_issue_number}: ${i.title}`).join('\n')}
${high.length > 3 ? `  ... and ${high.length - 3} more` : ''}
` : ''}

Configure reminders: .memories/issue-tracking/config.json
`;
}

function generateWeeklyDigest(state) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();

  const created = state.issues?.filter(i =>
    new Date(i.created_at) >= weekStart &&
    new Date(i.created_at) < weekEnd
  ) || [];

  const closed = state.issues?.filter(i =>
    i.status === 'CLOSED' &&
    i.closed_at &&
    new Date(i.closed_at) >= weekStart &&
    new Date(i.closed_at) < weekEnd
  ) || [];

  const avgTimeToClose = calculateAvgTimeToClose(closed);

  return `📊 PingMem Weekly Digest (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})

Activity Summary:
├─ ✅ Closed: ${closed.length} issues
├─ ➕ Created: ${created.length} issues
├─ 📈 Net Change: ${created.length - closed.length > 0 ? '+' : ''}${created.length - closed.length}
└─ ⏱️  Avg Time to Close: ${avgTimeToClose}

${created.length > 0 ? `
New Issues This Week:
${created.map(i => `  • #${i.github_issue_number}: ${i.title} (${i.severity})`).join('\n')}
` : ''}

${closed.length > 0 ? `
Resolved This Week:
${closed.map(i => `  • #${i.github_issue_number}: ${i.title}`).join('\n')}
` : ''}

Keep up the great work! 🎉
`;
}

async function sendReminder(message, type) {
  const config = loadConfig();
  const deliveryMethods = config.reminders?.delivery_methods || ['terminal', 'file'];

  // Terminal notification (macOS)
  if (deliveryMethods.includes('terminal') && process.platform === 'darwin') {
    try {
      const sanitized = message.replace(/"/g, '\\"').replace(/\n/g, ' ');
      execSync(`osascript -e 'display notification "${sanitized.substring(0, 200)}" with title "PingMem Issues"'`);
    } catch (error) {
      console.error('Failed to send terminal notification:', error.message);
    }
  }

  // File system (for agent pickup)
  if (deliveryMethods.includes('file')) {
    try {
      const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
      const reminderFile = path.join(memoryDir, 'issue-tracking', 'pending-reminders.md');
      fs.appendFileSync(reminderFile, `\n\n---\n\n${message}\n`);
    } catch (error) {
      console.error('Failed to write reminder file:', error.message);
    }
  }

  console.log(message);
}

async function sendDailySummary() {
  const state = loadState();
  const summary = generateDailySummary(state);

  if (summary) {
    await sendReminder(summary, 'daily');
  } else {
    console.log('No open issues. Skipping daily summary.');
  }
}

async function sendWeeklyDigest() {
  const state = loadState();
  const digest = generateWeeklyDigest(state);
  await sendReminder(digest, 'weekly');
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--daily')) {
    sendDailySummary().catch(console.error);
  } else if (args.includes('--weekly')) {
    sendWeeklyDigest().catch(console.error);
  } else {
    console.log('Usage: node reminder.js [--daily|--weekly]');
  }
}

module.exports = {
  sendDailySummary,
  sendWeeklyDigest,
  generateDailySummary,
  generateWeeklyDigest,
  sendReminder
};
