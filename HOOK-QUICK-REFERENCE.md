# Memory Intelligence Hooks - Quick Reference

## Installation (3 Steps)

```bash
# 1. Copy package to your project
cp -r ~/Projects/claude-memory-intelligence /path/to/your/project/.claude/memory-intelligence

# 2. Create config (customize as needed)
cat > /path/to/your/project/.memory-config.json << 'EOF'
{
  "project": {
    "memoryDir": ".memories"
  },
  "decisionIntelligence": {
    "categories": ["architecture", "database", "api", "ui", "infrastructure"]
  },
  "memory": {
    "codeExtensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go"]
  }
}
EOF

# 3. Initialize memory system
node .claude/memory-intelligence/core/scripts/init-memory.js
```

## Hook Configuration

### Register Hooks in Claude Code

Add to your project's `.claude/hooks/`:

```bash
cd .claude/hooks

# User prompt hook (auto-inject decision context)
ln -s ../memory-intelligence/core/hooks/user-prompt-submit.js user-prompt-submit

# Post-tool-use hook (auto-update memory)
ln -s ../memory-intelligence/core/hooks/post-tool-use.js post-tool-use
```

### Enable in Claude Settings

Edit `.claude/settings.json`:

```json
{
  "hooks": {
    "user_prompt_submit": ".claude/hooks/user-prompt-submit",
    "post_tool_use": ".claude/hooks/post-tool-use"
  }
}
```

## Hook Behaviors

### user-prompt-submit.js
**Triggers**: Before every Claude prompt
**Action**: Analyzes prompt, queries decision records, injects relevant context
**Latency**: <500ms (with LLM), <50ms (regex only)

**Example**:
```bash
# User types: "Implement Supabase auth"
# Hook detects: domains=[auth, database], tags=[supabase]
# Hook injects: Relevant decisions about auth patterns, deprecations
# Claude receives: Enriched prompt with memory context
```

### post-tool-use.js
**Triggers**: After every Write, Edit, MultiEdit operation
**Action**: Updates codebase-map.json, logs changes, triggers file-level scan
**Latency**: <100ms (folder-level), <500ms (file-level, background)

**Example**:
```bash
# Claude writes: src/auth/login.ts
# Hook updates: codebase-map.json with timestamp
# Hook logs: .memories/.pending-changes.log
# Hook triggers: File-level scan (background)
```

### decision-capture.js
**Triggers**: Manual invocation via CLI
**Action**: Captures decisions from evidence or interactive prompts
**Latency**: Interactive (user-driven)

**Example**:
```bash
# Interactive mode
node .claude/memory-intelligence/core/hooks/decision-capture.js --prompt

# Extract from story
node .claude/memory-intelligence/core/hooks/decision-capture.js --story AUTH-001

# Validate existing decision
node .claude/memory-intelligence/core/hooks/decision-capture.js --validate .memories/decisions/auth/DEC-AUTH-20251005-001.json
```

## Configuration Reference

### Minimal Config
```json
{
  "project": {
    "memoryDir": ".memories"
  }
}
```

### Full Config (All Options)
```json
{
  "project": {
    "root": ".",
    "memoryDir": ".memories",
    "decisionsSubdir": "decisions",
    "validatedSubdir": "validated"
  },
  "boundaries": {
    "protected": ["src/core/**", "src/lib/**"],
    "excluded": ["node_modules/**", ".git/**", "dist/**", "build/**"]
  },
  "workflow": {
    "storyPattern": "STORY-*",
    "manifestPath": ".research-manifests",
    "evidenceDir": "docs/evidence",
    "requireResearch": false,
    "requirePlan": false
  },
  "decisionIntelligence": {
    "enabled": true,
    "categories": ["architecture", "database", "api", "ui", "infrastructure", "auth"],
    "domains": ["architecture", "database", "api", "ui", "infrastructure", "auth"],
    "confidenceThreshold": 0.8,
    "deprecationTracking": true
  },
  "memory": {
    "autoUpdate": true,
    "updateTriggers": ["Write", "Edit", "MultiEdit", "NotebookEdit"],
    "scanCodeFiles": true,
    "codeExtensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".md"],
    "fileLevelScanning": true,
    "backgroundScanning": true
  },
  "intent": {
    "llmEnhancement": true,
    "regexFallback": true,
    "contextInjection": true,
    "confidenceThreshold": 0.7
  },
  "hooks": {
    "userPromptSubmit": {
      "enabled": true,
      "injectContext": true
    },
    "postToolUse": {
      "enabled": true,
      "autoUpdate": true
    },
    "decisionCapture": {
      "enabled": true,
      "autoExtract": true
    }
  }
}
```

## Project-Specific Customization

### Next.js Project
```json
{
  "boundaries": {
    "protected": ["src/app/**", "src/components/ui/**"],
    "excluded": ["node_modules/**", ".next/**", "out/**"]
  },
  "memory": {
    "codeExtensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"]
  }
}
```

### Python Project
```json
{
  "boundaries": {
    "protected": ["src/core/**", "src/lib/**"],
    "excluded": ["venv/**", "__pycache__/**", ".pytest_cache/**", "dist/**"]
  },
  "memory": {
    "codeExtensions": [".py", ".pyi", ".md"]
  },
  "workflow": {
    "evidenceDir": "docs/decisions"
  }
}
```

### Go Project
```json
{
  "boundaries": {
    "protected": ["internal/core/**", "pkg/**"],
    "excluded": ["vendor/**", "bin/**", "dist/**"]
  },
  "memory": {
    "codeExtensions": [".go", ".mod", ".sum", ".md"]
  },
  "decisionIntelligence": {
    "categories": ["architecture", "concurrency", "database", "api", "testing"]
  }
}
```

### Rust Project
```json
{
  "boundaries": {
    "protected": ["src/core/**", "src/lib.rs"],
    "excluded": ["target/**", "Cargo.lock"]
  },
  "memory": {
    "codeExtensions": [".rs", ".toml", ".md"]
  }
}
```

## Debugging

### Enable Debug Logging
```bash
export CLAUDE_DEBUG=true
```

### Test Hooks Manually

**Test user-prompt-submit:**
```bash
echo "Implement authentication with Supabase" > /tmp/test-prompt.txt
node .claude/memory-intelligence/core/hooks/user-prompt-submit.js /tmp/test-prompt.txt
cat /tmp/test-prompt.txt  # Should show injected context
```

**Test post-tool-use:**
```bash
# Simulate a file write
node .claude/memory-intelligence/core/hooks/post-tool-use.js Write src/test-file.ts

# Check if memory was updated
cat .memories/last-updated.json
```

**Test decision-capture:**
```bash
# Interactive mode
node .claude/memory-intelligence/core/hooks/decision-capture.js --prompt

# Validate output
node .claude/memory-intelligence/core/hooks/decision-capture.js --validate .memories/decisions/*/DEC-*.json
```

### Check Memory Health
```bash
node .claude/memory-intelligence/core/scripts/health-check.js
```

### View Decision Records
```bash
# Query all decisions
node .claude/memory-intelligence/core/scripts/decision-query.js --all

# Query by domain
node .claude/memory-intelligence/core/scripts/decision-query.js --domain auth

# Check for deprecated patterns
node .claude/memory-intelligence/core/scripts/decision-query.js --check-deprecated "NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

## Performance Tuning

### Disable LLM Enhancement (Faster, Regex-Only)
```json
{
  "intent": {
    "llmEnhancement": false
  }
}
```

Or via environment:
```bash
export CLAUDE_LLM_ENHANCEMENT=false
```

### Disable Background Scanning (Synchronous)
```json
{
  "memory": {
    "backgroundScanning": false
  }
}
```

### Reduce Scanned File Types
```json
{
  "memory": {
    "codeExtensions": [".ts", ".tsx"]  // Only TypeScript
  }
}
```

### Disable Auto-Updates (Manual Mode)
```json
{
  "memory": {
    "autoUpdate": false
  }
}
```

## Troubleshooting

### Issue: Hooks Not Running
```bash
# Check hook registration
ls -la .claude/hooks/

# Check permissions
chmod +x .claude/hooks/*

# Check Claude settings
cat .claude/settings.json | grep hooks
```

### Issue: Context Not Injected
```bash
# Check if decision-query.js exists
ls .claude/memory-intelligence/core/scripts/decision-query.js

# Test decision query manually
node .claude/memory-intelligence/core/scripts/decision-query.js --domain auth

# Check context injection enabled
grep contextInjection .memory-config.json
```

### Issue: Memory Not Updating
```bash
# Check if memory initialized
ls -la .memories/

# Check last update timestamp
cat .memories/last-updated.json

# Manually trigger update
node .claude/memory-intelligence/core/hooks/post-tool-use.js Write test.ts
```

### Issue: LLM Enhancement Failing
```bash
# Check Ollama availability
curl http://127.0.0.1:11434/api/tags

# Disable LLM enhancement
export CLAUDE_LLM_ENHANCEMENT=false

# Check if fallback to regex works
grep -i "regex" .memories/.pending-changes.log
```

## Best Practices

1. **Always configure `.memory-config.json`** - Don't rely on defaults
2. **Test hooks after installation** - Run manual tests before production use
3. **Keep decision records up-to-date** - Capture decisions immediately
4. **Review injected context periodically** - Ensure relevance
5. **Monitor performance** - Check hook latency in debug mode
6. **Backup decision records** - Include `.memories/decisions/` in version control
7. **Update config when project structure changes** - Keep protected paths current

## Support

For issues or questions:
1. Check debug logs: `export CLAUDE_DEBUG=true`
2. Run health check: `node core/scripts/health-check.js`
3. Review configuration: `cat .memory-config.json`
4. Check generalization summary: `GENERALIZATION-SUMMARY.md`

## Version

**Package**: claude-memory-intelligence
**Version**: 1.0.0
**Date**: October 5, 2025
**License**: MIT
