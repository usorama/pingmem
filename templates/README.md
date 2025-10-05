# Memory Intelligence Project Templates

Pre-configured templates for different project types to get started quickly with Claude Memory Intelligence.

## Available Templates

### 1. Default Template (`default/`)
**Best for**: Generic projects, custom setups, or when project type is unclear

**Features**:
- Auto-detection of project structure
- Generic protected paths (`core/**`, `config/**`)
- Monitors all common file types
- Minimal assumptions about stack

**Use when**:
- Starting a new project
- Working with a custom framework
- Need maximum flexibility

**Quick start**:
```bash
cp ~/Projects/claude-memory-intelligence/templates/default/.memory-config.json /path/to/project/
cd /path/to/project
node ~/Projects/claude-memory-intelligence/init.js
```

---

### 2. Next.js Template (`nextjs/`)
**Best for**: Next.js applications (App Router or Pages Router)

**Features**:
- Protects `middleware.ts`, `next.config.js`
- Monitors App Router (`app/**`) and Pages Router (`pages/**`)
- Protects API routes (`app/api/protected/**`)
- Excludes `.next/**`, Vercel artifacts

**Protected paths**:
- `middleware.ts` - Request routing/auth
- `next.config.js` - Build configuration
- `src/app/api/protected/**` - Secure API routes
- `src/protected-core/**` - Core services
- Database schemas (Prisma/Supabase)

**Use when**:
- Building Next.js applications
- Using Supabase or Prisma
- Need API route protection

**Quick start**:
```bash
cp ~/Projects/claude-memory-intelligence/templates/nextjs/.memory-config.json /path/to/nextjs-app/
cd /path/to/nextjs-app
node ~/Projects/claude-memory-intelligence/init.js
```

---

### 3. React Template (`react/`)
**Best for**: React applications (CRA, Vite, custom webpack)

**Features**:
- Protects core services and state management
- Monitors all React components
- Supports multiple bundlers (Vite, webpack, CRA)
- Auto-detects state management (Redux, Zustand, etc.)

**Protected paths**:
- `src/core/**` - Core business logic
- `src/services/**` - Service layer
- `src/store/**` - State management
- `src/contexts/AuthContext.tsx` - Critical contexts
- Build configs (`vite.config.ts`, `webpack.config.js`)

**Use when**:
- Building React applications
- Using Vite or Create React App
- Need state management protection

**Quick start**:
```bash
cp ~/Projects/claude-memory-intelligence/templates/react/.memory-config.json /path/to/react-app/
cd /path/to/react-app
node ~/Projects/claude-memory-intelligence/init.js
```

---

### 4. Python Template (`python/`)
**Best for**: Python projects (Django, FastAPI, Flask, libraries)

**Features**:
- Protects core modules and configuration
- Monitors all Python files and dependencies
- Protects database migrations
- Excludes virtual environments and bytecode

**Protected paths**:
- `core/**/*.py` - Core modules
- `config.py`, `settings.py` - Configuration
- `database.py`, `models/base.py` - Database layer
- `alembic/versions/**`, `migrations/**` - Migrations
- Middleware and core services

**Use when**:
- Building Django/FastAPI/Flask applications
- Creating Python libraries
- Need ORM/migration protection

**Quick start**:
```bash
cp ~/Projects/claude-memory-intelligence/templates/python/.memory-config.json /path/to/python-project/
cd /path/to/python-project
node ~/Projects/claude-memory-intelligence/init.js
```

---

## Template Comparison

| Feature | Default | Next.js | React | Python |
|---------|---------|---------|-------|--------|
| **Auto-detect** | ✅ | Framework-aware | Framework-aware | Framework-aware |
| **Protected Paths** | Generic | Next.js-specific | React-specific | Python-specific |
| **Build Config Protection** | ✅ | ✅ Next.js | ✅ Vite/webpack | ✅ Python |
| **Database Protection** | Basic | Prisma/Supabase | N/A | Alembic/Django |
| **API Protection** | Generic | API routes | N/A | Endpoints |
| **State Management** | N/A | N/A | ✅ Redux/Zustand | N/A |
| **Virtual Env Handling** | N/A | N/A | N/A | ✅ venv/Poetry |

## Configuration Schema

All templates use the same schema with different defaults:

```json
{
  "version": "1.0.0",
  "projectType": "auto-detect | nextjs | react | python",
  "features": {
    "codebaseTracking": true,
    "decisionIntelligence": true,
    "intentAnalysis": "hybrid",
    "autoUpdate": true,
    "validationGates": false
  },
  "ollama": {
    "enabled": true,
    "fallback": true,
    "model": "qwen2.5-coder:1.5b",
    "endpoint": "http://localhost:11434",
    "timeout": 2000
  },
  "boundaries": {
    "protected": [],
    "monitored": [],
    "ignored": []
  },
  "workflow": {
    "enabled": false,
    "storyPattern": "^[A-Z]+-\\d+$",
    "requiredPhases": ["research", "plan"]
  }
}
```

## Customization Guide

### Adding Protected Paths
```json
{
  "boundaries": {
    "protected": [
      "path/to/protect/**",
      "critical-file.ts"
    ]
  }
}
```

### Changing Monitored Files
```json
{
  "boundaries": {
    "monitored": [
      "src/**/*.ts",
      "**/*.config.js"
    ]
  }
}
```

### Ignoring Additional Paths
```json
{
  "boundaries": {
    "ignored": [
      "temp/**",
      "*.tmp"
    ]
  }
}
```

### Enabling Workflow Validation
```json
{
  "workflow": {
    "enabled": true,
    "storyPattern": "^PROJ-\\d+$",
    "requiredPhases": ["research", "plan", "implement"]
  }
}
```

## Template Selection Guide

**Choose Default when**:
- Unsure about project type
- Using a custom framework
- Need maximum flexibility
- Prototyping or experimenting

**Choose Next.js when**:
- Using Next.js 13+ (App Router)
- Using Next.js 12 (Pages Router)
- Need API route protection
- Using Supabase/Prisma

**Choose React when**:
- Using Create React App
- Using Vite + React
- Need state management protection
- Building React SPA

**Choose Python when**:
- Using Django
- Using FastAPI
- Using Flask
- Building Python libraries

## Common Patterns Across Templates

### All Templates Include

1. **Ollama Integration**
   - Hybrid intent analysis (LLM + heuristic)
   - Automatic fallback if Ollama unavailable
   - 2-second timeout for responsiveness

2. **Auto-Update Hooks**
   - PostToolUse hook (after file changes)
   - UserPromptSubmit hook (before new tasks)
   - Optional git post-commit hook

3. **Performance Optimization**
   - Throttled updates (100ms default)
   - Concurrent update limits (5 default)
   - Decision caching (1 hour TTL)

4. **Memory Structure**
   - `.memories/` directory (gitignored)
   - `codebase-map.json` (auto-updated)
   - `decisions/` (decision records)
   - `validated/` (validation results)

## Installation Steps (All Templates)

### 1. Copy Template
```bash
# Replace [template] with: default, nextjs, react, or python
cp ~/Projects/claude-memory-intelligence/templates/[template]/.memory-config.json /path/to/project/
```

### 2. Initialize Memory
```bash
cd /path/to/project
node ~/Projects/claude-memory-intelligence/init.js
```

### 3. Install Hooks (Optional - Claude Code)
```bash
cp ~/Projects/claude-memory-intelligence/hooks/* .claude/hooks/
chmod +x .claude/hooks/*.js
```

### 4. Customize Configuration
```bash
# Edit .memory-config.json to match your project
vim .memory-config.json
```

### 5. Add to .gitignore
```bash
echo ".memories/" >> .gitignore
echo ".memory-cache/" >> .gitignore
```

## Verification

After setup, verify installation:

```bash
# Check memory structure
ls -la .memories/

# Should show:
# .memories/
# ├── README.md
# ├── codebase-map.json
# ├── decisions/
# └── validated/

# Test memory refresh
node ~/Projects/claude-memory-intelligence/refresh.js

# Check decision system
node ~/Projects/claude-memory-intelligence/decision-query.js --help
```

## Template Maintenance

Templates are version-controlled and updated regularly:

- **Version**: 1.0.0 (current)
- **Last Updated**: October 2025
- **Compatibility**: Claude Code 4.0+

### Updating Templates

```bash
# Pull latest templates
cd ~/Projects/claude-memory-intelligence
git pull origin main

# Re-copy updated template (backs up existing config)
cp templates/[template]/.memory-config.json /path/to/project/.memory-config.json.new
```

## Getting Help

### Template-Specific Documentation
- Default: `templates/default/README.md`
- Next.js: `templates/nextjs/README.md`
- React: `templates/react/README.md`
- Python: `templates/python/README.md`

### General Documentation
- Main README: `~/Projects/claude-memory-intelligence/README.md`
- Memory System: `.memories/README.md` (after init)
- Decision System: `.memories/decisions/README.md`

### Common Issues

**Template not working?**
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check config syntax: `cat .memory-config.json | python -m json.tool`
- Review logs: `.memories/debug.log`

**Hooks not executing?**
- Make executable: `chmod +x .claude/hooks/*.js`
- Check Claude Code: `claude --version`
- Test manually: `node .claude/hooks/post-tool-use.js`

**Memory not updating?**
- Run manual refresh: `node ~/Projects/claude-memory-intelligence/refresh.js`
- Check file patterns: Review `boundaries.monitored` in config
- Verify hooks: `ls -la .claude/hooks/`

## Contributing

To contribute a new template:

1. Create directory: `templates/[template-name]/`
2. Add files:
   - `.memory-config.json` - Configuration
   - `README.md` - Documentation
   - `.gitignore` - Ignore patterns
3. Update this index
4. Submit pull request

## License

MIT License - All templates are free to use and modify

---

**Quick Reference**:
- Default: Generic/flexible
- Next.js: App Router, API routes, Supabase/Prisma
- React: Components, state, bundlers
- Python: Django, FastAPI, Flask, migrations
