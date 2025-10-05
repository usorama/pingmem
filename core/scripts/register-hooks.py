#!/usr/bin/env python3
"""
Register Pingmem hooks in Claude Code settings.json
Ensures hooks are properly integrated after installation
"""

import json
import os
import sys
from pathlib import Path

def register_hooks():
    """Register memory system hooks in Claude Code settings.json"""

    home = Path.home()
    settings_path = home / '.claude' / 'settings.json'

    # Ensure settings.json exists
    if not settings_path.exists():
        print(f"❌ Error: {settings_path} not found")
        print("   Claude Code may not be installed")
        return False

    try:
        # Load settings
        with open(settings_path, 'r') as f:
            settings = json.load(f)

        # Ensure hooks structure exists
        if 'hooks' not in settings:
            settings['hooks'] = {}

        if 'PostToolUse' not in settings['hooks']:
            settings['hooks']['PostToolUse'] = []

        if 'UserPromptSubmit' not in settings['hooks']:
            settings['hooks']['UserPromptSubmit'] = []

        # Hook paths
        memory_hook = f"python3 {home}/.claude/hooks/memory-update-posttooluse.py"
        github_hook = f"python3 {home}/.claude/hooks/github-issue-automation.py"
        pending_hook = f"python3 {home}/.claude/hooks/pending-issues-check.py"

        # Check if already registered (avoid duplicates)
        existing_commands = []
        for hook_entry in settings['hooks'].get('PostToolUse', []):
            for hook in hook_entry.get('hooks', []):
                existing_commands.append(hook.get('command', ''))

        for hook_entry in settings['hooks'].get('UserPromptSubmit', []):
            for hook in hook_entry.get('hooks', []):
                existing_commands.append(hook.get('command', ''))

        # Track what we add
        added = []

        # Add PostToolUse hooks (Write|Edit|MultiEdit matcher)
        if memory_hook not in existing_commands or github_hook not in existing_commands:
            # Check if there's already a Write|Edit|MultiEdit matcher
            write_matcher_exists = False
            for hook_entry in settings['hooks']['PostToolUse']:
                if hook_entry.get('matcher') == 'Write|Edit|MultiEdit':
                    # Add to existing matcher
                    if memory_hook not in existing_commands:
                        hook_entry['hooks'].append({
                            "type": "command",
                            "command": memory_hook,
                            "timeout": 5
                        })
                        added.append("memory-update-posttooluse.py (PostToolUse)")

                    if github_hook not in existing_commands:
                        hook_entry['hooks'].append({
                            "type": "command",
                            "command": github_hook,
                            "timeout": 5
                        })
                        added.append("github-issue-automation.py (PostToolUse)")

                    write_matcher_exists = True
                    break

            # Create new matcher if doesn't exist
            if not write_matcher_exists:
                new_hooks = []

                if memory_hook not in existing_commands:
                    new_hooks.append({
                        "type": "command",
                        "command": memory_hook,
                        "timeout": 5
                    })
                    added.append("memory-update-posttooluse.py (PostToolUse)")

                if github_hook not in existing_commands:
                    new_hooks.append({
                        "type": "command",
                        "command": github_hook,
                        "timeout": 5
                    })
                    added.append("github-issue-automation.py (PostToolUse)")

                if new_hooks:
                    settings['hooks']['PostToolUse'].append({
                        "matcher": "Write|Edit|MultiEdit",
                        "hooks": new_hooks
                    })

        # Add catch-all PostToolUse for issue detection
        if github_hook not in [cmd for cmd in existing_commands if 'github-issue' in cmd]:
            catchall_exists = False
            for hook_entry in settings['hooks']['PostToolUse']:
                if hook_entry.get('matcher') == '.*':
                    # Check if github hook already there
                    has_github = any(github_hook == h.get('command') for h in hook_entry.get('hooks', []))
                    if not has_github:
                        hook_entry['hooks'].append({
                            "type": "command",
                            "command": github_hook,
                            "timeout": 5
                        })
                        added.append("github-issue-automation.py (PostToolUse catchall)")
                    catchall_exists = True
                    break

            if not catchall_exists:
                settings['hooks']['PostToolUse'].append({
                    "matcher": ".*",
                    "hooks": [{
                        "type": "command",
                        "command": github_hook,
                        "timeout": 5
                    }]
                })
                added.append("github-issue-automation.py (PostToolUse catchall)")

        # Add UserPromptSubmit hook for pending issues
        if pending_hook not in existing_commands:
            # Check for existing .* matcher
            catchall_exists = False
            for hook_entry in settings['hooks']['UserPromptSubmit']:
                if hook_entry.get('matcher') == '.*':
                    # Add to existing
                    hook_entry['hooks'].append({
                        "type": "command",
                        "command": pending_hook,
                        "timeout": 3
                    })
                    added.append("pending-issues-check.py (UserPromptSubmit)")
                    catchall_exists = True
                    break

            if not catchall_exists:
                settings['hooks']['UserPromptSubmit'].append({
                    "matcher": ".*",
                    "hooks": [{
                        "type": "command",
                        "command": pending_hook,
                        "timeout": 3
                    }]
                })
                added.append("pending-issues-check.py (UserPromptSubmit)")

        # Write updated settings
        with open(settings_path, 'w') as f:
            json.dump(settings, f, indent=2)

        if added:
            print("✅ Registered hooks in settings.json:")
            for hook in added:
                print(f"   - {hook}")
            return True
        else:
            print("ℹ️  All hooks already registered in settings.json")
            return True

    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {settings_path}")
        print(f"   {e}")
        return False
    except Exception as e:
        print(f"❌ Error updating settings.json: {e}")
        return False

def main():
    """Main entry point"""
    print("🔗 Registering Pingmem hooks in Claude Code...")

    if register_hooks():
        print("✅ Hook registration complete")
        sys.exit(0)
    else:
        print("❌ Hook registration failed")
        sys.exit(1)

if __name__ == '__main__':
    main()
