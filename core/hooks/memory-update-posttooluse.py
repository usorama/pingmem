#!/usr/bin/env python3
"""
Memory Update Hook - PostToolUse Wrapper
Auto-updates memory system after EVERY file write/edit operation.
Wraps the memory-update-hook.js for Claude Code hook integration.
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def main():
    """Wrapper that calls memory-update-hook.js with proper arguments."""

    try:
        # Get hook input from Claude Code
        hook_input = json.loads(os.environ.get('CLAUDE_HOOK_INPUT', '{}'))

        tool_data = hook_input.get('tool', {})
        tool_name = tool_data.get('name', 'unknown')
        tool_args = tool_data.get('args', {})
        tool_result = hook_input.get('result', {})

        # Only proceed for file modification tools
        if tool_name not in ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']:
            sys.exit(0)

        # Extract file path from args
        file_path = (
            tool_args.get('file_path') or
            tool_args.get('path') or
            tool_args.get('notebook_path') or
            None
        )

        if not file_path:
            sys.exit(0)  # No file path, skip

        # Find the memory update hook script
        project_root = os.getcwd()
        hook_script = os.path.join(project_root, '.claude', 'hooks', 'memory-update-hook.js')

        if not os.path.isfile(hook_script):
            # Try parent directory (in case we're in a subdirectory)
            hook_script = os.path.join(project_root, '..', '.claude', 'hooks', 'memory-update-hook.js')

        if not os.path.isfile(hook_script):
            # Silent fail - memory system may not be initialized in this project
            sys.exit(0)

        # Call the memory update hook
        result = subprocess.run(
            ['node', hook_script, tool_name, file_path],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=5
        )

        # Silent success - memory updated
        sys.exit(0)

    except Exception as e:
        # Silent failure - don't disrupt normal operation
        # Memory update is optional and should never break core functionality
        sys.exit(0)

if __name__ == '__main__':
    main()
