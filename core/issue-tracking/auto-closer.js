#!/usr/bin/env node

/**
 * Issue Auto-Closer - Automatically close verified issues
 *
 * Triggers:
 * - Git commit with "fixes #N" or "closes #N"
 * - Lifecycle tracker detects PENDING_CLOSURE state
 * - Manual trigger via CLI
 *
 * @module issue-tracking/auto-closer
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();

function loadState() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(PROJECT_ROOT, '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');
    if (!fs.existsSync(statePath)) return { issues: [] };
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (error) {
    return { issues: [] };
  }
}

function saveState(state) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(PROJECT_ROOT, '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');
    state.last_updated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save state:', error.message);
  }
}

function loadConfig() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(PROJECT_ROOT, '.memories');
    const configPath = path.join(memoryDir, 'issue-tracking', 'config.json');
    if (!fs.existsSync(configPath)) {
      return {
        auto_closure: {
          enabled: true,
          confidence_threshold: 0.95,
          verify_typescript: true,
          verify_tests: true,
          verify_lint: false
        }
      };
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    return { auto_closure: { enabled: true, confidence_threshold: 0.95 } };
  }
}

async function verifyResolution(issue) {
  const config = loadConfig();
  const verificationResults = {
    typescript_check: false,
    tests_passing: false,
    lint_passing: false,
    manual_verification: false,
    confidence: 0.0
  };

  // TypeScript compilation (if enabled)
  if (config.auto_closure?.verify_typescript !== false) {
    try {
      execSync('npm run typecheck 2>&1', { cwd: PROJECT_ROOT, stdio: 'pipe' });
      verificationResults.typescript_check = true;
    } catch (error) {
      return {
        ...verificationResults,
        canClose: false,
        reason: 'TypeScript errors still exist'
      };
    }
  } else {
    verificationResults.typescript_check = true; // Skip if disabled
  }

  // Test suite (if enabled)
  if (config.auto_closure?.verify_tests !== false) {
    try {
      execSync('npm test 2>&1', { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 60000 });
      verificationResults.tests_passing = true;
    } catch (error) {
      return {
        ...verificationResults,
        canClose: false,
        reason: 'Tests are failing'
      };
    }
  } else {
    verificationResults.tests_passing = true; // Skip if disabled
  }

  // Linting (optional)
  if (config.auto_closure?.verify_lint) {
    try {
      execSync('npm run lint 2>&1', { cwd: PROJECT_ROOT, stdio: 'pipe' });
      verificationResults.lint_passing = true;
    } catch (error) {
      // Lint errors not blocking
    }
  }

  // Protected-core issues require manual verification
  if (issue.category === 'protected-core' || issue.category === 'architecture') {
    return {
      ...verificationResults,
      canClose: false,
      reason: 'Protected-core issues require manual verification'
    };
  }

  // Calculate confidence
  let confidence = 0.0;
  if (verificationResults.typescript_check) confidence += 0.40;
  if (verificationResults.tests_passing) confidence += 0.40;
  if (verificationResults.lint_passing) confidence += 0.10;

  // Check if related files were modified
  const relatedFilesModified = await checkRelatedFilesModified(issue);
  if (relatedFilesModified) confidence += 0.10;

  verificationResults.confidence = confidence;

  const threshold = config.auto_closure?.confidence_threshold || 0.95;

  return {
    ...verificationResults,
    canClose: confidence >= threshold,
    reason: confidence >= threshold ? 'All verification checks passed' : `Confidence ${(confidence * 100).toFixed(1)}% below threshold ${(threshold * 100)}%`
  };
}

async function checkRelatedFilesModified(issue) {
  try {
    const commits = execSync('git log -10 --name-only --pretty=format:', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    });

    const modifiedFiles = commits.split('\n').filter(Boolean);

    if (issue.file && modifiedFiles.some(f => f.includes(issue.file))) {
      return true;
    }

    if (issue.related_files) {
      return issue.related_files.some(f => modifiedFiles.some(mf => mf.includes(f)));
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function gatherEvidence(issue) {
  const evidence = {
    commits: [],
    files_modified: [],
    test_results: null
  };

  try {
    // Get recent commits
    const commits = execSync(
      `git log -10 --pretty=format:'%H|%s'`,
      { encoding: 'utf-8', cwd: PROJECT_ROOT }
    );

    evidence.commits = commits.split('\n').map(line => {
      const [sha, message] = line.split('|');
      return { sha, message };
    }).filter(c => c.sha);

    // Get modified files
    const files = execSync(
      'git log -10 --name-only --pretty=format:',
      { encoding: 'utf-8', cwd: PROJECT_ROOT }
    );

    evidence.files_modified = [...new Set(files.split('\n').filter(Boolean))].slice(0, 10);
  } catch (error) {
    console.error('Failed to gather evidence:', error.message);
  }

  return evidence;
}

function logClosureAttempt(issue, verification, status, errorMessage = null) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(PROJECT_ROOT, '.memories');
    const logsDir = path.join(memoryDir, 'issue-tracking', 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}-closures.log`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      issue_number: issue.github_issue_number,
      status,
      confidence: verification.confidence,
      reason: verification.reason,
      error: errorMessage
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log closure attempt:', error.message);
  }
}

async function autoCloseIssue(issue) {
  const verification = await verifyResolution(issue);

  if (!verification.canClose) {
    logClosureAttempt(issue, verification, 'failed');
    console.log(`Cannot close issue #${issue.github_issue_number}: ${verification.reason}`);
    return false;
  }

  const evidence = await gatherEvidence(issue);

  const closureComment = `## ✅ Auto-Closed: Issue Resolved

**Resolution Verified**: ${new Date().toISOString()}
**Confidence**: ${(verification.confidence * 100).toFixed(1)}%

### Verification Results

${Object.entries(verification)
  .filter(([key]) => key.endsWith('_check') || key.endsWith('_passing'))
  .map(([key, value]) => `- ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`)
  .join('\n')}

### Resolution Evidence

${evidence.commits.length > 0 ? `
**Related Commits**:
${evidence.commits.slice(0, 5).map(c => `- ${c.sha.slice(0,7)}: ${c.message}`).join('\n')}
` : ''}

${evidence.files_modified.length > 0 ? `
**Files Modified**:
${evidence.files_modified.slice(0, 10).map(f => `- \`${f}\``).join('\n')}
` : ''}

---

**Auto-closed by PingMem Issue Tracking System**
**Configuration**: \`.memories/issue-tracking/config.json\`
`;

  // Update local state
  try {
    const state = loadState();
    const issueIndex = state.issues?.findIndex(i =>
      i.github_issue_number === issue.github_issue_number ||
      i.internal_id === issue.internal_id
    );

    if (issueIndex !== -1) {
      state.issues[issueIndex].status = 'CLOSED';
      state.issues[issueIndex].closed_at = new Date().toISOString();
      state.issues[issueIndex].closed_by = 'auto-closer';
      state.issues[issueIndex].closure_verification = verification;

      if (!state.issues[issueIndex].state_history) {
        state.issues[issueIndex].state_history = [];
      }

      state.issues[issueIndex].state_history.push({
        from: issue.status,
        to: 'CLOSED',
        timestamp: new Date().toISOString(),
        trigger: 'auto-closer'
      });

      state.statistics = state.statistics || {};
      state.statistics.closed_issues = (state.statistics.closed_issues || 0) + 1;
      state.statistics.auto_closed = (state.statistics.auto_closed || 0) + 1;
      state.statistics.open_issues = Math.max(0, (state.statistics.open_issues || 0) - 1);

      saveState(state);
    }

    logClosureAttempt(issue, verification, 'success');
    console.log(`✅ Successfully closed issue #${issue.github_issue_number}`);
    console.log(`Closure comment:\n${closureComment}`);

    return true;
  } catch (error) {
    logClosureAttempt(issue, verification, 'error', error.message);
    console.error('Failed to close issue:', error.message);
    return false;
  }
}

async function processCommitMessage() {
  try {
    const commitMsg = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT
    });

    const issueNumbers = commitMsg.match(/(?:fixes|closes)\s+#(\d+)/gi);

    if (!issueNumbers || issueNumbers.length === 0) {
      console.log('No issue references found in commit message.');
      return;
    }

    const state = loadState();

    for (const ref of issueNumbers) {
      const issueNum = parseInt(ref.match(/#(\d+)/)[1]);
      const issue = state.issues?.find(i => i.github_issue_number === issueNum);

      if (issue && issue.status !== 'CLOSED') {
        console.log(`Processing issue #${issueNum} from commit...`);
        await autoCloseIssue(issue);
      }
    }
  } catch (error) {
    console.error('Failed to process commit message:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--trigger') && args.includes('git-commit')) {
    processCommitMessage().catch(console.error);
  } else if (args.includes('--issue')) {
    const issueNum = parseInt(args[args.indexOf('--issue') + 1]);
    const state = loadState();
    const issue = state.issues?.find(i => i.github_issue_number === issueNum);

    if (issue) {
      autoCloseIssue(issue).catch(console.error);
    } else {
      console.error(`Issue #${issueNum} not found.`);
    }
  } else {
    console.log('Usage: node auto-closer.js [--trigger git-commit | --issue <number>]');
  }
}

module.exports = {
  autoCloseIssue,
  verifyResolution,
  gatherEvidence,
  processCommitMessage,
  logClosureAttempt
};
