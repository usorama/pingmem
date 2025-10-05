# Template Quick Start Guide

## 60-Second Setup

### 1. Choose Your Template

```bash
# Generic project
TEMPLATE="default"

# Next.js project
TEMPLATE="nextjs"

# React project (CRA, Vite, etc.)
TEMPLATE="react"

# Python project (Django, FastAPI, Flask)
TEMPLATE="python"
```

### 2. Copy Configuration

```bash
cd /path/to/your/project
cp ~/Projects/claude-memory-intelligence/templates/$TEMPLATE/.memory-config.json .
```

### 3. Initialize Memory

```bash
node ~/Projects/claude-memory-intelligence/init.js
```

### 4. Install Hooks (Optional - for Claude Code)

```bash
cp ~/Projects/claude-memory-intelligence/hooks/* .claude/hooks/
chmod +x .claude/hooks/*.js
```

### 5. Verify Setup

```bash
# Check memory structure was created
ls -la .memories/

# Test memory refresh
node ~/Projects/claude-memory-intelligence/refresh.js

# Query decision system
node ~/Projects/claude-memory-intelligence/decision-query.js --help
```

**Done!** Memory intelligence is now active in your project.

---

## Decision Tree: Which Template?

```
Are you building a web application?
├─ Yes
│  ├─ Using Next.js?
│  │  └─ ✅ Use nextjs template
│  ├─ Using React (CRA, Vite, etc.)?
│  │  └─ ✅ Use react template
│  └─ Using another framework?
│     └─ ✅ Use default template
│
└─ No
   ├─ Python project (Django, FastAPI, Flask)?
   │  └─ ✅ Use python template
   └─ Other language/framework?
      └─ ✅ Use default template
```

---

## Template Cheat Sheet

### Default Template
```bash
# Best for
- Generic projects
- Custom frameworks
- Prototyping

# Protects
- core/**
- config/**

# Monitors
- **/*.{ts,js,json,md}
```

### Next.js Template
```bash
# Best for
- Next.js 13+ (App Router)
- Next.js 12 (Pages Router)
- Supabase/Prisma projects

# Protects
- middleware.ts
- next.config.js
- app/api/protected/**
- prisma/schema.prisma
- supabase/migrations/**

# Monitors
- **/*.{ts,tsx,js,jsx}
- app/**
- pages/**
- components/**
```

### React Template
```bash
# Best for
- Create React App
- Vite + React
- React SPAs

# Protects
- src/core/**
- src/services/**
- src/store/**
- src/contexts/*Context.tsx
- vite.config.ts

# Monitors
- src/**/*.{ts,tsx,js,jsx}
- public/**/*.html
```

### Python Template
```bash
# Best for
- Django projects
- FastAPI projects
- Flask projects
- Python libraries

# Protects
- core/**/*.py
- config.py
- settings.py
- database.py
- alembic/versions/**
- migrations/**

# Monitors
- **/*.py
- requirements.txt
- pyproject.toml
```

---

## Common Commands

### After Setup

```bash
# Refresh memory (manual)
node ~/Projects/claude-memory-intelligence/refresh.js

# Query decisions
node ~/Projects/claude-memory-intelligence/decision-query.js --search "auth"
node ~/Projects/claude-memory-intelligence/decision-query.js --domain routing
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "old-pattern"

# Health check
node ~/Projects/claude-memory-intelligence/health-check.js

# Capture new decision
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain [domain] \
  --decision "Decision title" \
  --rationale "Why we made this choice"
```

---

## Customization Quick Reference

### Add Protected Path

Edit `.memory-config.json`:
```json
{
  "boundaries": {
    "protected": [
      "existing/path/**",
      "new/path/**"         // ← ADD THIS
    ]
  }
}
```

### Add Monitored Files

```json
{
  "boundaries": {
    "monitored": [
      "**/*.ts",
      "**/*.custom"         // ← ADD THIS
    ]
  }
}
```

### Ignore Additional Paths

```json
{
  "boundaries": {
    "ignored": [
      "node_modules/**",
      "temp/**"             // ← ADD THIS
    ]
  }
}
```

### Enable Workflow Validation

```json
{
  "workflow": {
    "enabled": true,        // ← CHANGE THIS
    "storyPattern": "^PROJ-\\d+$",
    "requiredPhases": ["research", "plan"]
  }
}
```

---

## Verification Checklist

After setup, verify:

- [ ] `.memory-config.json` exists in project root
- [ ] `.memories/` directory created
- [ ] `.memories/codebase-map.json` exists
- [ ] `.memories/decisions/` directory exists
- [ ] `.memories/README.md` exists
- [ ] Hooks installed in `.claude/hooks/` (if using Claude Code)
- [ ] `.memories/` added to `.gitignore`
- [ ] Memory refresh works: `node ~/Projects/claude-memory-intelligence/refresh.js`

---

## Troubleshooting

### Memory not updating?
```bash
# Check hooks are executable
chmod +x .claude/hooks/*.js

# Manual refresh
node ~/Projects/claude-memory-intelligence/refresh.js

# Check config syntax
cat .memory-config.json | python -m json.tool
```

### Ollama not working?
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Verify model is installed
ollama list

# Fallback mode is enabled by default
# (will use heuristics if Ollama fails)
```

### Hooks not executing?
```bash
# Check Claude Code version
claude --version

# Test hook manually
node .claude/hooks/post-tool-use.js

# Check hook permissions
ls -la .claude/hooks/
```

---

## Template Migration

### Switching Templates

```bash
# Backup current config
cp .memory-config.json .memory-config.json.backup

# Copy new template
cp ~/Projects/claude-memory-intelligence/templates/[new-template]/.memory-config.json .

# Merge any custom settings from backup
# (manually edit .memory-config.json)

# Refresh memory with new config
node ~/Projects/claude-memory-intelligence/refresh.js
```

---

## Next Steps

After basic setup:

1. **Review Protected Paths**: Ensure critical files are protected
2. **Customize Monitoring**: Add project-specific file patterns
3. **Test Decision System**: Query for existing decisions
4. **Document Decisions**: Capture important architectural choices
5. **Integrate with Workflow**: Enable workflow validation if using story-based development

---

## Full Documentation

- **Template Details**: `templates/[template]/README.md`
- **Configuration Comparison**: `templates/CONFIGURATION-COMPARISON.md`
- **Main Documentation**: `~/Projects/claude-memory-intelligence/README.md`
- **Memory System Guide**: `.memories/README.md` (after init)

---

## Support

**Template Issues**:
- Check template README: `templates/[template]/README.md`
- Review configuration: `templates/CONFIGURATION-COMPARISON.md`

**General Issues**:
- Main README: `~/Projects/claude-memory-intelligence/README.md`
- Health check: `node ~/Projects/claude-memory-intelligence/health-check.js`

**Hook Issues**:
- Claude Code docs: `~/.claude/`
- Hook source: `~/Projects/claude-memory-intelligence/hooks/`

---

**Quick Reference Card**

```
SETUP: Copy config → Initialize → Install hooks → Verify
QUERY: decision-query.js --search | --domain | --check-deprecated
REFRESH: refresh.js (manual update)
CUSTOMIZE: Edit .memory-config.json → refresh.js
TROUBLESHOOT: health-check.js → Review logs → Check permissions
```

**Memory is automatic after setup. Set it and forget it!**
