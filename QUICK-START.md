# Quick Start Guide

Get the Claude Memory Intelligence system running in your project in under 5 minutes.

## 🚀 Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Git (recommended)

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd /path/to/claude-memory-intelligence
npm install
```

This installs:
- `minimatch` (required) - Pattern matching for boundary validation
- `ollama` (optional) - LLM enhancement for intent analysis

### Step 2: Initialize in Your Project

```bash
cd /path/to/your/project
node /path/to/claude-memory-intelligence/core/scripts/init-memory.js
```

This creates:
```
your-project/
├── .memories/
│   ├── README.md
│   ├── codebase-map.json
│   ├── decisions/
│   │   ├── TEMPLATE.json
│   │   ├── auth/
│   │   ├── database/
│   │   ├── api/
│   │   ├── ui/
│   │   ├── testing/
│   │   ├── infra/
│   │   └── arch/
│   └── validated/
└── .claude/
    ├── config/
    │   ├── llm-enhancement.json
    │   └── codebase-scan.json
    ├── scripts/  (symlinks to core scripts)
    └── lib/      (symlinks to core libraries)
```

### Step 3: Verify Installation

```bash
node .claude/scripts/health-check.js
```

Expected output:
```
🔍 Claude Memory Intelligence System - Health Check
   Project: YourProjectName
   Path: /path/to/your/project

📁 Checking directory structure...
   ✅ Directory exists: .memories
   ✅ Directory exists: .memories/decisions
   ✅ Directory exists: .claude
   ...

📊 HEALTH CHECK SUMMARY
✅ Passed: 15
⚠️  Warnings: 2
❌ Failed: 0

✅ All critical checks passed!
```

## 🎯 Basic Usage

### Create Your First Decision Record

```bash
# 1. Copy the template
cp .memories/decisions/TEMPLATE.json .memories/decisions/auth/DEC-AUTH-20251005-001.json

# 2. Edit with your decision details
# 3. Query it
node .claude/scripts/decision-query.js --id DEC-AUTH-20251005-001
```

### Generate Codebase Map

```bash
node .claude/scripts/generate-codebase-map.js
```

This scans your project and creates a comprehensive map of:
- Directory structure and purposes
- Tech stack (auto-detected from package.json)
- Protected boundaries
- Recent git changes
- Key files

### Query Decisions

```bash
# Check if a pattern is deprecated
node .claude/scripts/decision-query.js --check-deprecated "OLD_API_KEY"

# Find all auth-related decisions
node .claude/scripts/decision-query.js --domain auth

# Search by keyword
node .claude/scripts/decision-query.js --search "database migration"

# Show all migrations
node .claude/scripts/decision-query.js --migration-status
```

### Track File Changes

```javascript
// In your code or hooks
const FileTracker = require('./.claude/lib/file-tracker');
const BoundaryValidator = require('./.claude/lib/boundary-validator');

// Validate before writing
const validation = BoundaryValidator.validate('/src/file.ts', 'write');
if (!validation.allowed) {
  throw new Error(`Protected: ${validation.reason}`);
}

// Track the change
FileTracker.trackChange('/src/file.ts', 'write');
```

## ⚙️ Configuration

### Customize Codebase Scanning

Edit `.claude/config/codebase-scan.json`:

```json
{
  "project_name": "MyProject",
  "project_description": "My awesome project",
  "protected_boundaries": [
    "src/core/**",
    "src/protected/**"
  ],
  "analyze_dirs": [
    "src",
    "docs",
    "tests"
  ],
  "ignore_dirs": [
    "node_modules",
    ".next",
    "dist"
  ],
  "scan_depth": 2
}
```

### Enable LLM Enhancement (Optional)

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Pull a model:**
   ```bash
   ollama pull llama3.2:1b
   ```

4. **Test connection:**
   ```bash
   node .claude/lib/ollama-client.js --health
   ```

   Expected: `Ollama available: true`

### Customize LLM Settings

Edit `.claude/config/llm-enhancement.json`:

```json
{
  "enabled": true,
  "ollama": {
    "host": "http://127.0.0.1:11434",
    "model": "llama3.2:1b",
    "timeout_ms": 2000
  }
}
```

## 📋 Common Tasks

### Add Protected Boundary

```bash
# Add to config
node .claude/lib/boundary-validator.js --add "src/core/**"

# Add to validated boundaries
node .claude/lib/boundary-validator.js --add "src/core/**" --validated

# List all boundaries
node .claude/lib/boundary-validator.js --list
```

### Check File Against Boundaries

```bash
node .claude/lib/boundary-validator.js --test src/core/file.ts
```

### View Decision Record

```bash
# By ID
node .claude/scripts/decision-query.js --id DEC-AUTH-20251005-001 --verbose

# By domain
node .claude/scripts/decision-query.js --domain auth --verbose

# By tag
node .claude/scripts/decision-query.js --tag migration --verbose
```

### Update Codebase Map

```bash
# Default update
node .claude/scripts/generate-codebase-map.js

# Custom output
node .claude/scripts/generate-codebase-map.js --output /custom/path/map.json
```

## 🔧 Troubleshooting

### Issue: "Decisions directory not found"

**Solution:**
```bash
node /path/to/core/scripts/init-memory.js --force
```

### Issue: "Ollama unavailable"

**Solution 1:** Start Ollama
```bash
ollama serve
```

**Solution 2:** Disable LLM enhancement in `.claude/config/llm-enhancement.json`:
```json
{
  "enabled": false
}
```

The system will fall back to regex-only mode (no functionality loss, just less accurate intent detection).

### Issue: "Config file invalid"

**Solution:**
```bash
# Regenerate config
node .claude/scripts/init-memory.js --force
```

### Issue: "Health check fails"

**Solution:**
```bash
# Verbose output for debugging
node .claude/scripts/health-check.js --verbose
```

## 🎓 Next Steps

1. **Create decision records** for key architecture decisions
2. **Set up protected boundaries** for critical code
3. **Integrate with hooks** (if using Claude Code)
4. **Generate codebase maps** regularly
5. **Query decisions** before making changes

## 📚 Documentation

- **Core Scripts:** [core/README.md](core/README.md)
- **Extraction Summary:** [EXTRACTION-SUMMARY.md](EXTRACTION-SUMMARY.md)
- **Decision Schema:** See `.memories/decisions/TEMPLATE.json`

## 💡 Tips

1. **Version control** - Commit `.memories/` to git for team sharing
2. **Regular updates** - Regenerate codebase map after major changes
3. **High confidence** - Use confidence_score > 0.9 for critical decisions
4. **Tag generously** - Makes searching easier later
5. **Link docs** - Always include canonical documentation links

## 🆘 Getting Help

1. Check health: `node .claude/scripts/health-check.js --verbose`
2. View documentation: `cat core/README.md`
3. Review examples: `.memories/decisions/TEMPLATE.json`

---

**Ready to go!** Your project now has full memory and decision tracking capabilities.
