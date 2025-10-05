#!/usr/bin/env node

/**
 * Issue Tracking CLI - Manual operations
 *
 * Commands:
 * - create: Create issue manually
 * - list: List open/closed issues
 * - close: Close issue manually
 * - stats: View statistics
 * - sync: Force lifecycle sync
 * - test: Test detection
 *
 * @module scripts/issue-cli
 */

const fs = require('fs');
const path = require('path');

const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

/**
 * Load state
 */
function loadState() {
  if (!fs.existsSync(statePath)) {
    console.error('Issue tracking not initialized. Run setup first.');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

/**
 * Create issue manually
 */
async function createIssue(args) {
  const { createManualIssue } = require('../issue-tracking/manager');

  const title = args.title || 'Manual issue';
  const description = args.description || args.error || 'No description provided';
  const severity = args.severity || 'medium';
  const category = args.category || 'user-reported';
  const file = args.file || null;

  try {
    const issue = await createManualIssue({
      title,
      description,
      severity,
      category,
      file,
      labels: args.labels ? args.labels.split(',') : []
    });

    console.log('✅ Issue created successfully!');
    console.log(`   Issue #: ${issue.github_issue_number || issue.internal_id}`);
    console.log(`   Title: ${title}`);
    console.log(`   Severity: ${severity}`);
  } catch (error) {
    console.error('❌ Failed to create issue:', error.message);
    process.exit(1);
  }
}

/**
 * List issues
 */
function listIssues(args) {
  const state = loadState();
  const status = args.status || 'open';
  const severity = args.severity || null;

  let issues = state.issues || [];

  // Filter by status
  if (status === 'open') {
    issues = issues.filter(i => i.status !== 'CLOSED');
  } else if (status === 'closed') {
    issues = issues.filter(i => i.status === 'CLOSED');
  }

  // Filter by severity
  if (severity) {
    issues = issues.filter(i => i.severity === severity);
  }

  if (issues.length === 0) {
    console.log(`No ${status} issues found.`);
    return;
  }

  console.log(`\n📋 ${status.toUpperCase()} ISSUES (${issues.length})\n`);

  issues.forEach(issue => {
    const severity_icon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[issue.severity] || '⚪';

    console.log(`${severity_icon} #${issue.github_issue_number || issue.internal_id}: ${issue.title}`);
    console.log(`   Severity: ${issue.severity} | Category: ${issue.category}`);
    console.log(`   Status: ${issue.status} | Created: ${new Date(issue.created_at).toLocaleString()}`);
    console.log('');
  });
}

/**
 * Close issue
 */
async function closeIssue(args) {
  const { closeManualIssue } = require('../issue-tracking/manager');

  const issueNumber = parseInt(args.number || args.issue || args.id);
  const comment = args.comment || null;

  if (isNaN(issueNumber)) {
    console.error('❌ Invalid issue number');
    process.exit(1);
  }

  try {
    const success = await closeManualIssue(issueNumber, comment);

    if (success) {
      console.log(`✅ Issue #${issueNumber} closed successfully.`);
    } else {
      console.error(`❌ Failed to close issue #${issueNumber}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * View statistics
 */
function viewStats() {
  const state = loadState();
  const stats = state.statistics || {};

  console.log('\n📊 ISSUE TRACKING STATISTICS\n');
  console.log(`Total Issues: ${stats.total_issues || 0}`);
  console.log(`├─ Open: ${stats.open_issues || 0}`);
  console.log(`├─ Closed: ${stats.closed_issues || 0}`);
  console.log(`│  ├─ Auto-closed: ${stats.auto_closed || 0}`);
  console.log(`│  └─ Manual-closed: ${stats.manual_closed || 0}`);
  console.log(`├─ Avg Time to Close: ${stats.avg_time_to_close_hours || 0} hours`);
  console.log(`├─ Detection Accuracy: ${((stats.detection_accuracy || 0) * 100).toFixed(1)}%`);
  console.log(`└─ Deduplication Accuracy: ${((stats.deduplication_accuracy || 0) * 100).toFixed(1)}%`);
  console.log('');
}

/**
 * Force lifecycle sync
 */
async function syncLifecycle() {
  const { trackIssueLifecycle } = require('../issue-tracking/lifecycle-tracker');

  console.log('Syncing issue lifecycle...');

  try {
    await trackIssueLifecycle();
    console.log('✅ Lifecycle sync complete.');
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test detection
 */
async function testDetection(args) {
  const { detectIssue } = require('../issue-tracking/detector');

  const error = args.error || 'Test error message';
  const file = args.file || null;

  try {
    const context = await detectIssue({
      error,
      source: 'manual',
      file
    });

    console.log('✅ Detection successful!\n');
    console.log('Detected Context:');
    console.log(JSON.stringify(context, null, 2));
  } catch (error) {
    console.error('❌ Detection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Print usage
 */
function printUsage() {
  console.log(`
📋 Issue Tracking CLI

USAGE:
  node issue-cli.js <command> [options]

COMMANDS:
  create          Create issue manually
  list            List issues
  close           Close issue manually
  stats           View statistics
  sync            Force lifecycle sync
  test            Test detection
  help            Show this help message

CREATE OPTIONS:
  --title         Issue title
  --description   Issue description
  --severity      Severity (critical|high|medium|low)
  --category      Category
  --file          Related file path
  --labels        Comma-separated labels

LIST OPTIONS:
  --status        Filter by status (open|closed|all)
  --severity      Filter by severity

CLOSE OPTIONS:
  --number        Issue number
  --comment       Closure comment

TEST OPTIONS:
  --error         Error message to test
  --file          File path

EXAMPLES:
  # Create issue
  node issue-cli.js create --title "Bug in auth" --severity high

  # List open issues
  node issue-cli.js list --status open

  # Close issue
  node issue-cli.js close --number 123 --comment "Fixed"

  # View statistics
  node issue-cli.js stats

  # Sync lifecycle
  node issue-cli.js sync

  # Test detection
  node issue-cli.js test --error "error TS2345: Type error" --file "src/test.ts"
`);
}

/**
 * Parse CLI arguments
 */
function parseArgs(argv) {
  const args = {};
  let current = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      current = arg.substring(2);
      args[current] = true;
    } else if (current) {
      args[current] = arg;
      current = null;
    }
  }

  return args;
}

/**
 * Main CLI entry point
 */
async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = argv[0];
  const args = parseArgs(argv.slice(1));

  switch (command) {
    case 'create':
      await createIssue(args);
      break;

    case 'list':
      listIssues(args);
      break;

    case 'close':
      await closeIssue(args);
      break;

    case 'stats':
      viewStats();
      break;

    case 'sync':
      await syncLifecycle();
      break;

    case 'test':
      await testDetection(args);
      break;

    case 'help':
    default:
      printUsage();
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI error:', error.message);
    process.exit(1);
  });
}

module.exports = { main };
