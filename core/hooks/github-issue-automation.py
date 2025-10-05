#!/usr/bin/env python3
"""
GitHub Issue Automation - PostToolUse Integration
Detects errors and queues them for GitHub issue creation via MCP.

ARCHITECTURE:
1. PostToolUse: Detect error → Queue to pending-issues.json
2. UserPromptSubmit: Check queue → Inject into Claude context
3. Claude: Read queue → Create issues via mcp__github__create_issue
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = os.getcwd()
MEMORIES_DIR = os.path.join(PROJECT_ROOT, '.memories')
ISSUE_TRACKING_DIR = os.path.join(MEMORIES_DIR, 'issue-tracking')
PENDING_ISSUES_FILE = os.path.join(ISSUE_TRACKING_DIR, 'pending-issues.json')
CONFIG_FILE = os.path.join(ISSUE_TRACKING_DIR, 'config.json')

def ensure_directories():
    """Ensure issue tracking directories exist."""
    os.makedirs(ISSUE_TRACKING_DIR, exist_ok=True)
    os.makedirs(os.path.join(ISSUE_TRACKING_DIR, 'logs'), exist_ok=True)
    os.makedirs(os.path.join(ISSUE_TRACKING_DIR, 'issues'), exist_ok=True)

def load_config():
    """Load issue tracking configuration."""
    if not os.path.exists(CONFIG_FILE):
        return None

    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def load_pending_issues():
    """Load pending issues queue."""
    if not os.path.exists(PENDING_ISSUES_FILE):
        return []

    with open(PENDING_ISSUES_FILE, 'r') as f:
        return json.load(f)

def save_pending_issues(issues):
    """Save pending issues queue."""
    ensure_directories()
    with open(PENDING_ISSUES_FILE, 'w') as f:
        json.dump(issues, f, indent=2)

def detect_error(tool_name, args, result):
    """Detect if tool result contains an error."""
    # Check for error in result
    error_text = None

    if isinstance(result, dict):
        error_text = result.get('error') or result.get('stderr')
    elif isinstance(result, str):
        error_text = result

    if not error_text:
        return None

    # Check if it's a real error (avoid false positives)
    error_patterns = [
        r'error', r'Error', r'ERROR',
        r'FAIL', r'Failed', r'Exception',
        r'Fatal', r'TS\d+',  # TypeScript errors
        r'SyntaxError', r'TypeError', r'ReferenceError'
    ]

    import re
    if not any(re.search(pattern, error_text) for pattern in error_patterns):
        return None

    # Extract file path
    file_path = (
        args.get('file_path') or
        args.get('path') or
        args.get('notebook_path') or
        'unknown'
    )

    # Classify error
    severity = 'medium'
    category = 'unknown-error'

    if 'TS' in error_text or 'type' in error_text.lower():
        category = 'type-error'
        severity = 'high'
    elif 'syntax' in error_text.lower():
        category = 'syntax-error'
        severity = 'high'
    elif 'exception' in error_text.lower() or 'fatal' in error_text.lower():
        category = 'runtime-error'
        severity = 'critical'

    return {
        'error_message': error_text[:1000],  # Limit length
        'source': 'posttooluse',
        'file': file_path,
        'severity': severity,
        'category': category,
        'detected_at': datetime.utcnow().isoformat() + 'Z',
        'tool': tool_name
    }

def queue_issue(error_context):
    """Add error to pending issues queue."""
    config = load_config()

    if not config or not config.get('detection', {}).get('enabled'):
        return  # Detection disabled

    # Check severity threshold
    threshold = config.get('detection', {}).get('severity_thresholds', {}).get('auto_create_above', 'high')
    severity_order = ['low', 'medium', 'high', 'critical']

    error_severity_idx = severity_order.index(error_context['severity'])
    threshold_idx = severity_order.index(threshold)

    if error_severity_idx < threshold_idx:
        return  # Below threshold

    # Load pending issues
    pending = load_pending_issues()

    # Check for duplicates (same file + similar error)
    for existing in pending:
        if (existing.get('file') == error_context['file'] and
            existing.get('category') == error_context['category']):
            return  # Already queued

    # Add to queue
    pending.append(error_context)
    save_pending_issues(pending)

    # Log detection
    log_file = os.path.join(ISSUE_TRACKING_DIR, 'logs', 'detections.log')
    log_entry = f"{error_context['detected_at']} | {error_context['severity']} | {error_context['category']} | {error_context['file']}\n"

    with open(log_file, 'a') as f:
        f.write(log_entry)

def main():
    """Main hook handler for PostToolUse."""
    try:
        # Get hook input from Claude Code
        hook_input = json.loads(os.environ.get('CLAUDE_HOOK_INPUT', '{}'))

        tool_data = hook_input.get('tool', {})
        tool_name = tool_data.get('name', 'unknown')
        tool_args = tool_data.get('args', {})
        tool_result = hook_input.get('result', {})

        # Detect error
        error_context = detect_error(tool_name, tool_args, tool_result)

        if error_context:
            queue_issue(error_context)

        # Silent success
        sys.exit(0)

    except Exception as e:
        # Silent failure - don't disrupt operation
        sys.exit(0)

if __name__ == '__main__':
    main()
