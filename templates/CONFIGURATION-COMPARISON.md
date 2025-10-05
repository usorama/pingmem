# Template Configuration Comparison

## Overview
This document highlights the key differences between each project template's `.memory-config.json` file.

## Common Features (All Templates)

All templates share these base features:

```json
{
  "version": "1.0.0",
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
    "timeout": 2000,
    "retries": 2
  },
  "hooks": {
    "enabled": true,
    "postToolUse": true,
    "userPromptSubmit": true,
    "gitPostCommit": false
  },
  "performance": {
    "maxConcurrentUpdates": 5,
    "updateThrottleMs": 100,
    "cacheDecisions": true,
    "cacheTTL": 3600000
  }
}
```

## Template-Specific Differences

### 1. Default Template

**Project Type**: `"auto-detect"`

**Protected Boundaries**:
```json
{
  "protected": [
    "core/**",
    "lib/core/**",
    "src/core/**",
    "config/**"
  ]
}
```

**Monitored Files**:
```json
{
  "monitored": [
    "**/*.ts",
    "**/*.js",
    "**/*.json",
    "**/*.md"
  ]
}
```

**Ignored Patterns**:
```json
{
  "ignored": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    "*.log",
    "coverage/**",
    ".next/**",
    ".vercel/**"
  ]
}
```

**Use Case**: Generic projects, maximum flexibility, custom frameworks

---

### 2. Next.js Template

**Project Type**: `"nextjs"`

**Protected Boundaries** (Extended):
```json
{
  "protected": [
    "middleware.ts",              // ← Next.js-specific
    "middleware.js",
    "next.config.js",             // ← Next.js-specific
    "next.config.mjs",
    "src/app/api/protected/**",   // ← Next.js API routes
    "app/api/protected/**",
    "src/protected-core/**",
    "src/core/**",
    "src/lib/core/**",
    "lib/core/**",
    "src/services/core/**",
    "prisma/schema.prisma",       // ← Database schema
    "supabase/migrations/**"      // ← Supabase migrations
  ]
}
```

**Monitored Files** (Extended):
```json
{
  "monitored": [
    "**/*.ts",
    "**/*.tsx",                   // ← React/Next.js
    "**/*.js",
    "**/*.jsx",
    "app/**",                     // ← App Router
    "src/app/**",
    "pages/**",                   // ← Pages Router
    "components/**",              // ← React components
    "src/components/**",
    "lib/**",
    "src/lib/**",
    "*.config.{js,ts,mjs}",      // ← Config files
    "package.json",
    "tsconfig.json"
  ]
}
```

**Ignored Patterns** (Extended):
```json
{
  "ignored": [
    "node_modules/**",
    ".next/**",                   // ← Next.js build
    "out/**",                     // ← Static export
    "build/**",
    "dist/**",
    ".git/**",
    "*.log",
    "coverage/**",
    ".vercel/**",                 // ← Vercel deployment
    ".turbo/**",                  // ← Turborepo
    "public/**",
    "*.lock",
    "yarn.lock",
    "pnpm-lock.yaml"
  ]
}
```

**Framework-Specific Config**:
```json
{
  "nextjs": {
    "version": "auto-detect",
    "appRouter": true,
    "typescript": true,
    "protectedRoutes": [
      "/api/protected/**",
      "/api/auth/**"
    ],
    "envFiles": [
      ".env.local",
      ".env.production"
    ]
  }
}
```

**Use Case**: Next.js applications, API routes, Supabase/Prisma projects

---

### 3. React Template

**Project Type**: `"react"`

**Protected Boundaries** (React-focused):
```json
{
  "protected": [
    "src/core/**",
    "src/services/**",
    "src/lib/core/**",
    "src/utils/core/**",
    "src/config/**",
    "src/api/core/**",
    "src/contexts/AuthContext.tsx",    // ← React contexts
    "src/contexts/ThemeContext.tsx",
    "src/hooks/core/**",               // ← React hooks
    "src/store/**",                    // ← State management
    "vite.config.ts",                  // ← Vite config
    "vite.config.js",
    "webpack.config.js",               // ← Webpack config
    "craco.config.js"                  // ← CRA override
  ]
}
```

**Monitored Files** (React-focused):
```json
{
  "monitored": [
    "src/**/*.{ts,tsx,js,jsx}",       // ← React components
    "public/**/*.html",
    "*.config.{js,ts}",
    "package.json",
    "tsconfig.json"
  ]
}
```

**Ignored Patterns** (React-focused):
```json
{
  "ignored": [
    "node_modules/**",
    "build/**",                       // ← CRA build
    "dist/**",                        // ← Vite build
    ".git/**",
    "coverage/**",
    "*.log",
    "public/static/**",
    ".cache/**",                      // ← Build cache
    "*.lock",
    "yarn.lock",
    "pnpm-lock.yaml"
  ]
}
```

**Framework-Specific Config**:
```json
{
  "react": {
    "version": "auto-detect",
    "bundler": "auto-detect",         // vite, webpack, etc.
    "typescript": true,
    "stateManagement": "auto-detect", // redux, zustand, etc.
    "router": "auto-detect"           // react-router, etc.
  }
}
```

**Use Case**: React SPAs, Vite/CRA projects, component libraries

---

### 4. Python Template

**Project Type**: `"python"`

**Protected Boundaries** (Python-focused):
```json
{
  "protected": [
    "core/**/*.py",                   // ← Python modules
    "src/core/**/*.py",
    "app/core/**/*.py",
    "lib/**/*.py",
    "config.py",                      // ← Django/Flask config
    "config/**/*.py",
    "settings.py",                    // ← Django settings
    "settings/**/*.py",
    "database.py",                    // ← Database connection
    "models/base.py",                 // ← Base models
    "services/core/**/*.py",
    "utils/core/**/*.py",
    "middleware/**/*.py",             // ← Middleware
    "alembic/versions/**",            // ← Alembic migrations
    "migrations/**"                   // ← Django migrations
  ]
}
```

**Monitored Files** (Python-focused):
```json
{
  "monitored": [
    "**/*.py",                        // ← All Python files
    "requirements.txt",               // ← pip
    "requirements/**/*.txt",
    "pyproject.toml",                 // ← Poetry/PDM
    "setup.py",
    "setup.cfg",
    "Pipfile",                        // ← Pipenv
    "poetry.lock",
    ".env.example",
    "alembic.ini",
    "pytest.ini",
    "tox.ini"
  ]
}
```

**Ignored Patterns** (Python-focused):
```json
{
  "ignored": [
    "venv/**",                        // ← Virtual environments
    ".venv/**",
    "env/**",
    "__pycache__/**",                 // ← Python bytecode
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".Python",
    "build/**",
    "dist/**",
    "*.egg-info/**",
    ".pytest_cache/**",               // ← Test cache
    ".mypy_cache/**",                 // ← Type checker cache
    ".coverage",
    "htmlcov/**",
    ".git/**",
    "*.log"
  ]
}
```

**Framework-Specific Config**:
```json
{
  "python": {
    "version": "auto-detect",
    "framework": "auto-detect",       // django, fastapi, flask
    "packageManager": "auto-detect",  // pip, poetry, pipenv
    "typeChecking": true
  }
}
```

**Use Case**: Django/FastAPI/Flask projects, Python libraries, backend APIs

---

## Key Differences Summary

### Protected Paths

| Template | Unique Protected Paths |
|----------|------------------------|
| **Default** | Generic `core/**`, `config/**` |
| **Next.js** | `middleware.ts`, `next.config.js`, `app/api/protected/**`, `prisma/schema.prisma`, `supabase/migrations/**` |
| **React** | `src/contexts/*Context.tsx`, `src/hooks/core/**`, `src/store/**`, `vite.config.ts`, `webpack.config.js` |
| **Python** | `*.py` files, `config.py`, `settings.py`, `database.py`, `alembic/versions/**`, `migrations/**` |

### Monitored Files

| Template | File Patterns |
|----------|---------------|
| **Default** | `**/*.{ts,js,json,md}` |
| **Next.js** | `**/*.{ts,tsx,js,jsx}`, `app/**`, `pages/**`, `components/**` |
| **React** | `src/**/*.{ts,tsx,js,jsx}`, `public/**/*.html` |
| **Python** | `**/*.py`, `requirements.txt`, `pyproject.toml`, `Pipfile` |

### Ignored Patterns

| Template | Build Artifacts | Dependencies | Framework-Specific |
|----------|----------------|--------------|-------------------|
| **Default** | `dist/**`, `build/**` | `node_modules/**` | `.next/**`, `.vercel/**` |
| **Next.js** | `.next/**`, `out/**` | `node_modules/**`, `*.lock` | `.vercel/**`, `.turbo/**`, `public/**` |
| **React** | `build/**`, `dist/**` | `node_modules/**`, `*.lock` | `.cache/**`, `public/static/**` |
| **Python** | `build/**`, `dist/**`, `*.egg-info/**` | `venv/**`, `.venv/**` | `__pycache__/**`, `.pytest_cache/**`, `.mypy_cache/**` |

### Framework-Specific Configurations

| Template | Additional Config |
|----------|------------------|
| **Default** | None (maximum flexibility) |
| **Next.js** | `nextjs.version`, `nextjs.appRouter`, `nextjs.protectedRoutes`, `nextjs.envFiles` |
| **React** | `react.bundler`, `react.stateManagement`, `react.router` |
| **Python** | `python.framework`, `python.packageManager`, `python.typeChecking` |

## Migration Between Templates

### From Default → Specific Template

**Why**: You started with default and now know your framework

**Steps**:
1. Backup current config: `cp .memory-config.json .memory-config.json.backup`
2. Copy new template: `cp ~/Projects/claude-memory-intelligence/templates/[template]/.memory-config.json .`
3. Merge custom settings from backup
4. Refresh memory: `node ~/Projects/claude-memory-intelligence/refresh.js`

### From Specific Template → Another Template

**Example**: React → Next.js (migrating to Next.js)

**Steps**:
1. Document migration decision (recommended)
2. Copy Next.js template config
3. Adjust protected paths for your specific needs
4. Refresh memory system
5. Verify boundaries are correct

## Customization Recommendations

### When to Customize

**Add Protected Paths**:
- You have additional core modules
- Critical business logic needs protection
- Database schemas or migrations

**Add Monitored Files**:
- Custom file extensions
- Specific configuration files
- Documentation that affects implementation

**Add Ignored Patterns**:
- Local development files
- IDE-specific directories
- Large media/asset directories

### Customization Examples

#### Example 1: Add Supabase to React Template
```json
{
  "boundaries": {
    "protected": [
      "src/core/**",
      "src/lib/supabase/client.ts",    // ADD
      "src/lib/supabase/server.ts",    // ADD
      "supabase/migrations/**"         // ADD
    ]
  }
}
```

#### Example 2: Add tRPC to Next.js Template
```json
{
  "boundaries": {
    "protected": [
      "middleware.ts",
      "src/server/api/trpc.ts",        // ADD
      "src/server/api/routers/**",     // ADD
      "src/server/db.ts"               // ADD
    ]
  }
}
```

#### Example 3: Add Celery to Python Template
```json
{
  "boundaries": {
    "protected": [
      "core/**/*.py",
      "celery_app.py",                 // ADD
      "tasks/**/*.py",                 // ADD
      "config/celery_config.py"        // ADD
    ]
  }
}
```

## Performance Considerations

### File Pattern Efficiency

**Efficient** (specific patterns):
```json
{
  "monitored": [
    "src/**/*.ts",
    "app/**/*.tsx"
  ]
}
```

**Inefficient** (too broad):
```json
{
  "monitored": [
    "**/*"  // ❌ Monitors everything, slow
  ]
}
```

### Ignore Pattern Optimization

**Good** (excludes large directories):
```json
{
  "ignored": [
    "node_modules/**",
    "dist/**",
    "public/assets/**"  // Large static files
  ]
}
```

**Better** (also excludes temp/cache):
```json
{
  "ignored": [
    "node_modules/**",
    "dist/**",
    "public/assets/**",
    ".cache/**",
    "*.log",
    "coverage/**"
  ]
}
```

## Validation

### Verify Template Configuration

```bash
# Check JSON syntax
cat .memory-config.json | python -m json.tool

# Verify protected paths exist
for path in $(cat .memory-config.json | jq -r '.boundaries.protected[]'); do
  if [ -e "$path" ]; then
    echo "✅ $path exists"
  else
    echo "⚠️  $path not found (will be protected when created)"
  fi
done

# Test memory refresh
node ~/Projects/claude-memory-intelligence/refresh.js
```

## Support

For template-specific questions:
- Default: `templates/default/README.md`
- Next.js: `templates/nextjs/README.md`
- React: `templates/react/README.md`
- Python: `templates/python/README.md`

For configuration help:
- Schema documentation: This file
- Main README: `~/Projects/claude-memory-intelligence/README.md`

## License

MIT License - Modify templates freely for your projects
