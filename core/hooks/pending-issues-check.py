#!/usr/bin/env python3
"""
Pending Issues Check - UserPromptSubmit Hook
Checks for pending GitHub issues and injects reminder into Claude context.

FLOW:
1. Check pending-issues.json
2. If issues exist, inject reminder with full context
3. Claude automatically creates GitHub issues via MCP
4. Clear queue after creation
"""

import os
import sys
import json
from pathlib import Path

PROJECT_ROOT = os.getcwd()
PENDING_ISSUES_FILE = os.path.join(PROJECT_ROOT, '.memories', 'issue-tracking', 'pending-issues.json')

def load_pending_issues():
    """Load pending issues queue."""
    if not os.path.exists(PENDING_ISSUES_FILE):
        return []

    try:
        with open(PENDING_ISSUES_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def format_issue_context(issue):
    """Format issue for Claude context."""
    severity_emoji = {
        'critical': '🔴',
        'high': '🟠',
        'medium': '🟡',
        'low': '🟢'
    }.get(issue['severity'], '⚪')

    return f"""
{severity_emoji} **{issue['category'].replace('-', ' ').title()}** in `{issue['file']}`
- Severity: {issue['severity']}
- Detected: {issue['detected_at']}
- Error: {issue['error_message'][:200]}...
"""

def main():
    """Check for pending issues and inject into context."""
    pending = load_pending_issues()

    if not pending:
        sys.exit(0)  # No pending issues

    # Inject reminder into Claude context
    reminder = f"""
<system-reminder>
⚠️ **PENDING GITHUB ISSUES DETECTED** ({len(pending)} issues)

The following errors were detected and queued for GitHub issue creation:

{''.join(format_issue_context(issue) for issue in pending)}

**ACTION REQUIRED**:
Use `mcp__github__create_issue` to create these issues, then clear the queue by deleting `/Users/umasankrudhya/Projects/pinglearn/.memories/issue-tracking/pending-issues.json`

**Queue Location**: `{PENDING_ISSUES_FILE}`
</system-reminder>
"""

    print(reminder)
    sys.exit(0)

if __name__ == '__main__':
    main()
