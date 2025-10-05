# Default Memory Intelligence Template

## Overview
This is the default template for projects using Claude Memory Intelligence. It provides sensible defaults for most project types with automatic detection of project structure.

## What's Included

### Configuration (`.memory-config.json`)
- **Codebase Tracking**: Automatic tracking of all code changes
- **Decision Intelligence**: WHY/HOW/WHAT-NOT-TO-DO decision capture
- **Intent Analysis**: Hybrid LLM + heuristic analysis
- **Auto-Update**: Memory updates after every file operation

### Protected Boundaries
The template protects common core directories:
- `core/**` - Core functionality
- `lib/core/**` - Core libraries
- `src/core/**` - Core source code
- `config/**` - Configuration files

### Monitored Files
Tracks changes to:
- TypeScript/JavaScript files (`**/*.ts`, `**/*.js`)
- Configuration files (`**/*.json`)
- Documentation (`**/*.md`)

### Ignored Paths
Excludes from tracking:
- Dependencies (`node_modules/**`)
- Build artifacts (`dist/**`, `build/**`)
- Version control (`.git/**`)
- Logs and coverage reports

## Getting Started

### 1. Copy Template to Your Project
```bash
cp ~/Projects/claude-memory-intelligence/templates/default/.memory-config.json /path/to/your/project/
```

### 2. Initialize Memory System
```bash
cd /path/to/your/project
node ~/Projects/claude-memory-intelligence/init.js
```

### 3. Customize Configuration
Edit `.memory-config.json` to match your project structure:
- Add project-specific protected paths
- Adjust monitored file patterns
- Enable/disable features as needed

### 4. Set Up Hooks (Optional)
If using Claude Code:
```bash
# Copy hooks to .claude/hooks/
cp ~/Projects/claude-memory-intelligence/hooks/* .claude/hooks/

# Make executable
chmod +x .claude/hooks/*.js
```

## Configuration Options

### Features
- `codebaseTracking`: Track all file changes (Layer 1-2)
- `decisionIntelligence`: Capture WHY/HOW decisions (Layer 4)
- `intentAnalysis`: "hybrid" | "llm" | "heuristic"
- `autoUpdate`: Auto-update memory after changes
- `validationGates`: Enable workflow validation (for structured projects)

### Ollama Settings
- `enabled`: Use Ollama for intent analysis
- `fallback`: Fall back to heuristics if Ollama fails
- `model`: LLM model to use (default: `qwen2.5-coder:1.5b`)
- `timeout`: Request timeout in milliseconds

### Workflow (Advanced)
Disable by default. Enable for projects with formal story workflows:
```json
{
  "workflow": {
    "enabled": true,
    "storyPattern": "^PROJ-\\d+$",
    "requiredPhases": ["research", "plan", "implement"]
  }
}
```

## Customization Examples

### Example 1: Protect Additional Directories
```json
{
  "boundaries": {
    "protected": [
      "core/**",
      "src/auth/**",
      "src/database/**"
    ]
  }
}
```

### Example 2: Monitor Specific File Types
```json
{
  "boundaries": {
    "monitored": [
      "**/*.ts",
      "**/*.tsx",
      "**/*.css",
      "schema.prisma"
    ]
  }
}
```

### Example 3: Disable Ollama
```json
{
  "ollama": {
    "enabled": false
  },
  "features": {
    "intentAnalysis": "heuristic"
  }
}
```

## Memory Structure

After initialization, you'll have:
```
.memories/
├── README.md                           # Memory system guide
├── codebase-map.json                   # Auto-updated file tracking
├── decisions/                          # Decision records
│   ├── README.md
│   └── [domain]/[decision-id].md
└── validated/                          # Validation results
    └── protected-core-boundaries.md
```

## Commands

### Refresh Memory
```bash
node ~/Projects/claude-memory-intelligence/refresh.js
```

### Query Decisions
```bash
# Check for deprecated patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "old-pattern"

# Find decisions by domain
node ~/Projects/claude-memory-intelligence/decision-query.js --domain auth

# Search decisions
node ~/Projects/claude-memory-intelligence/decision-query.js --search "authentication"
```

### Health Check
```bash
node ~/Projects/claude-memory-intelligence/health-check.js
```

## Best Practices

1. **Commit `.memory-config.json`** - Share configuration with team
2. **Add `.memories/` to `.gitignore`** - Memory data is local
3. **Review protected boundaries** - Ensure core code is protected
4. **Use decision queries** - Check for deprecated patterns before implementation
5. **Keep Ollama running** - For best intent analysis (optional but recommended)

## Troubleshooting

### Memory not updating?
- Check hooks are executable: `chmod +x .claude/hooks/*.js`
- Verify configuration: `cat .memory-config.json`
- Run manual refresh: `node ~/Projects/claude-memory-intelligence/refresh.js`

### Ollama not working?
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Verify model is installed: `ollama list`
- Enable fallback mode in config (already enabled by default)

### Protected boundaries not enforced?
- Ensure `validationGates` is enabled if using workflow
- Check PostToolUse hook is active
- Review `.memories/validated/` for validation results

## Support

For issues or questions:
- Documentation: `~/Projects/claude-memory-intelligence/README.md`
- Examples: See other templates (nextjs, react, python)
- Memory Guide: `.memories/README.md` (after initialization)

## License

MIT License - Use freely in your projects
