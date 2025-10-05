#!/usr/bin/env node

/**
 * Git Post-Commit Hook - Auto-Closure Integration
 *
 * Triggers auto-closure of issues referenced in commit messages
 * Detects patterns like "fixes #123" or "closes #456"
 *
 * Install: Copy to .git/hooks/post-commit and make executable
 * @module hooks/git-post-commit
 */

const path = require('path');
const fs = require('fs');

/**
 * Main hook handler
 */
async function handleGitPostCommit() {
  try {
    // Check if issue tracking is configured
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const issueTrackingConfig = path.join(memoryDir, 'issue-tracking', 'config.json');

    if (!fs.existsSync(issueTrackingConfig)) {
      // Issue tracking not configured, skip
      return;
    }

    const config = JSON.parse(fs.readFileSync(issueTrackingConfig, 'utf-8'));

    if (!config.auto_closure?.enabled) {
      // Auto-closure disabled
      return;
    }

    // Load issue manager
    const { handleGitCommit } = require('../issue-tracking/manager');

    // Process commit message for issue references
    await handleGitCommit();

  } catch (error) {
    if (process.env.CLAUDE_DEBUG) {
      console.error('Git post-commit hook error:', error.message);
    }
    // Silent failure - don't block commit
  }
}

// Run if executed directly
if (require.main === module) {
  handleGitPostCommit().catch(error => {
    if (process.env.CLAUDE_DEBUG) {
      console.error('Hook execution failed:', error.message);
    }
    process.exit(0); // Don't block commit on error
  });
}

module.exports = { handleGitPostCommit };
