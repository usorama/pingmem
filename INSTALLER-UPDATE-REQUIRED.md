# Installer Update Required - Integration Hooks

## Critical Changes Needed

The installer (`install.sh` and `install.js`) **MUST** be updated to include:

### 1. Hook Registration in settings.json

**Current Gap**: Installer copies hooks but doesn't register them in `~/.claude/settings.json`

**Required Addition**:
```javascript
// After copying hooks, update settings.json:
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Add to PostToolUse hooks
settings.hooks.PostToolUse = settings.hooks.PostToolUse || [];
settings.hooks.PostToolUse.push({
  matcher: "Write|Edit|MultiEdit",
  hooks: [
    {
      type: "command",
      command: `python3 ${os.homedir()}/.claude/hooks/memory-update-posttooluse.py`,
      timeout: 5
    },
    {
      type: "command",
      command: `python3 ${os.homedir()}/.claude/hooks/github-issue-automation.py`,
      timeout: 5
    }
  ]
});

// Add catch-all for issue detection
settings.hooks.PostToolUse.push({
  matcher: ".*",
  hooks: [
    {
      type: "command",
      command: `python3 ${os.homedir()}/.claude/hooks/github-issue-automation.py`,
      timeout: 5
    }
  ]
});

// Add to UserPromptSubmit hooks
settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];
settings.hooks.UserPromptSubmit.push({
  matcher: ".*",
  hooks: [
    {
      type: "command",
      command: `python3 ${os.homedir()}/.claude/hooks/pending-issues-check.py`,
      timeout: 3
    }
  ]
});

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
```

### 2. Post-Install Verification

**Required**: Run `core/scripts/verify-integration.sh` after installation

**Add to installer**:
```bash
# At end of install.sh
echo ""
echo "🔍 Running integration verification..."
if bash "$INSTALL_DIR/core/scripts/verify-integration.sh"; then
  echo ""
  echo "✅ Installation complete and verified!"
else
  echo ""
  echo "⚠️  Installation complete but verification failed"
  echo "   Please review errors above and run:"
  echo "   bash $INSTALL_DIR/core/scripts/verify-integration.sh"
  exit 1
fi
```

### 3. Hook Permissions

**Required**: Ensure all Python hooks are executable

```bash
chmod +x ~/.claude/hooks/memory-update-posttooluse.py
chmod +x ~/.claude/hooks/github-issue-automation.py
chmod +x ~/.claude/hooks/pending-issues-check.py
```

### 4. Documentation Update

**Add to README.md**:

```markdown
## Verifying Installation

After installation, verify everything is integrated:

\`\`\`bash
bash core/scripts/verify-integration.sh
\`\`\`

This will test:
- ✅ All hooks are installed
- ✅ Hooks are registered in settings.json
- ✅ Memory updates work end-to-end
- ✅ Issue detection works end-to-end
- ✅ Issue reminders work end-to-end

If verification fails, the installer did not complete properly.
```

## Implementation Checklist

- [ ] Update `install.sh` to register hooks in settings.json
- [ ] Update `install.js` to register hooks in settings.json
- [ ] Add verification script execution to installer
- [ ] Ensure hook permissions are set correctly
- [ ] Test installer on clean system
- [ ] Update README.md with verification instructions
- [ ] Add troubleshooting section for failed verification

## Testing the Updated Installer

1. **Remove current installation**:
   ```bash
   rm -rf ~/.claude/hooks/memory-* ~/.claude/hooks/github-* ~/.claude/hooks/pending-*
   ```

2. **Run updated installer**:
   ```bash
   ./install.sh
   ```

3. **Verify hooks are registered**:
   ```bash
   grep -A 5 "memory-update-posttooluse.py" ~/.claude/settings.json
   ```

4. **Run verification**:
   ```bash
   bash core/scripts/verify-integration.sh
   ```

5. **Expected output**: All tests pass ✅

## Why This Matters

**Without settings.json registration**:
- ❌ Hooks exist but NEVER run
- ❌ Memory never auto-updates
- ❌ Issues never auto-detect
- ❌ System appears installed but is NON-FUNCTIONAL

**With proper integration**:
- ✅ Hooks automatically trigger
- ✅ Memory always current
- ✅ Issues automatically detected
- ✅ Complete automation works

## Installer Files to Update

1. `install.sh` (lines ~400-500) - Add settings.json update
2. `install.js` (lines ~300-400) - Add settings.json update
3. `README.md` - Add verification section
4. `QUICK-START.md` - Reference verification step
