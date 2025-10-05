# Python Memory Intelligence Template

## Overview
Memory intelligence configuration for Python projects (Django, FastAPI, Flask, pure Python libraries).

## Key Features

### Python-Specific Protections
- **Core Modules**: `core/**/*.py`, `src/core/**/*.py` - Core business logic
- **Configuration**: `config.py`, `settings.py` - Application configuration
- **Database**: `database.py`, `models/base.py` - Database models and connections
- **Migrations**: `alembic/versions/**`, `migrations/**` - Database migrations
- **Core Services**: `services/core/**/*.py` - Critical service layer
- **Middleware**: `middleware/**/*.py` - Request/response processing

### Monitored Patterns
- All Python files (`**/*.py`)
- Dependency files: `requirements.txt`, `pyproject.toml`, `Pipfile`
- Configuration: `.env.example`, `alembic.ini`, `pytest.ini`
- Package setup: `setup.py`, `setup.cfg`

### Python Exclusions
- Virtual environments: `venv/**`, `.venv/**`, `env/**`
- Bytecode: `__pycache__/**`, `*.pyc`, `*.pyo`
- Build artifacts: `build/**`, `dist/**`, `*.egg-info/**`
- Test/coverage: `.pytest_cache/**`, `.coverage`, `htmlcov/**`

## Quick Start

### 1. Copy Template
```bash
# From your Python project root
cp ~/Projects/claude-memory-intelligence/templates/python/.memory-config.json .
```

### 2. Initialize Memory System
```bash
node ~/Projects/claude-memory-intelligence/init.js
```

### 3. Set Up Hooks (Claude Code)
```bash
# Install hooks
cp ~/Projects/claude-memory-intelligence/hooks/* .claude/hooks/
chmod +x .claude/hooks/*.js
```

### 4. Customize for Your Framework
Edit `.memory-config.json` based on your setup:

```json
{
  "boundaries": {
    "protected": [
      "core/**/*.py",
      "app/models/**/*.py",        // Django models
      "app/settings.py",           // Django settings
      "alembic/versions/**"        // Database migrations
    ]
  }
}
```

## Python Project Structure

The template supports common Python structures:

### Django Project
```
your-django-app/
├── app/
│   ├── core/**                  # Protected core apps
│   ├── settings.py              # Protected settings
│   ├── models/**                # Protected models
│   ├── views/                   # Monitored views
│   └── api/                     # Monitored API
├── manage.py
├── requirements.txt             # Monitored
├── .memory-config.json
└── .memories/                   # Auto-generated
```

### FastAPI Project
```
your-fastapi-app/
├── app/
│   ├── core/**                  # Protected core
│   ├── models/**                # Protected models
│   ├── services/**              # Protected services
│   ├── api/                     # Monitored endpoints
│   └── main.py                  # Monitored
├── alembic/                     # Protected migrations
├── requirements.txt
├── .memory-config.json
└── .memories/
```

### Flask Project
```
your-flask-app/
├── app/
│   ├── core/**                  # Protected core
│   ├── models.py                # Protected models
│   ├── config.py                # Protected config
│   ├── routes/                  # Monitored routes
│   └── __init__.py
├── migrations/                  # Protected migrations
├── requirements.txt
└── .memory-config.json
```

## Configuration Examples

### Example 1: Django with PostgreSQL
```json
{
  "boundaries": {
    "protected": [
      "app/settings.py",
      "app/settings/**/*.py",
      "app/core/**/*.py",
      "app/models/**/*.py",
      "migrations/**/*.py"
    ]
  },
  "python": {
    "framework": "django",
    "packageManager": "pip"
  }
}
```

### Example 2: FastAPI with Alembic
```json
{
  "boundaries": {
    "protected": [
      "app/core/**/*.py",
      "app/models/**/*.py",
      "app/database.py",
      "alembic/versions/**/*.py"
    ]
  },
  "python": {
    "framework": "fastapi",
    "packageManager": "poetry"
  }
}
```

### Example 3: Flask with SQLAlchemy
```json
{
  "boundaries": {
    "protected": [
      "app/config.py",
      "app/models.py",
      "app/database.py",
      "migrations/versions/**/*.py"
    ]
  },
  "python": {
    "framework": "flask",
    "packageManager": "pip"
  }
}
```

## Python-Specific Workflows

### Model Changes
Memory tracks:
- ORM model definitions
- Database schema changes
- Migration files
- Model relationships

### API Development
Captures:
- Endpoint definitions
- Request/response schemas
- Authentication/authorization
- API versioning decisions

### Service Layer
Monitors:
- Business logic organization
- Service dependencies
- Error handling patterns
- Async vs sync decisions

## Protected Patterns

### Common Protected Files
```
core/**/*.py              # Core business logic
config.py                 # Application configuration
settings.py               # Django settings
database.py               # Database connection
models/base.py           # Base model classes
services/core/**/*.py    # Core services
alembic/versions/**      # Database migrations
```

### Why These Are Protected
- **Core Logic**: Foundation of business rules
- **Configuration**: Environment-specific settings
- **Models**: Database schema definitions
- **Migrations**: Database version control
- **Services**: Critical business operations

## Memory Intelligence Features

### Codebase Tracking
- Tracks all Python module changes
- Monitors dependency updates
- Captures migration additions
- Records configuration changes

### Decision Intelligence
Captures decisions about:
- Framework choice (Django vs FastAPI vs Flask)
- Database ORM patterns
- Authentication strategies
- API design patterns
- Async vs sync approaches

### Intent Analysis
Detects:
- New feature modules vs refactoring
- Model changes vs migrations
- API endpoint additions vs modifications
- Configuration changes vs code changes

## Commands

### Refresh Memory
```bash
node ~/Projects/claude-memory-intelligence/refresh.js
```

### Check for Deprecated Patterns
```bash
# Check for deprecated Django patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "Django 3.x"

# Check for old async patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "asyncio.coroutine"
```

### Find Decisions by Domain
```bash
node ~/Projects/claude-memory-intelligence/decision-query.js --domain database
node ~/Projects/claude-memory-intelligence/decision-query.js --domain api
node ~/Projects/claude-memory-intelligence/decision-query.js --domain authentication
```

## Integration with Python Tools

### Type Checking
Memory system works with type checkers:
```json
{
  "python": {
    "typeChecking": true
  }
}
```
Compatible with: mypy, pyright, pyre

### Package Managers
Auto-detects and supports:
- pip (`requirements.txt`)
- Poetry (`pyproject.toml`, `poetry.lock`)
- Pipenv (`Pipfile`, `Pipfile.lock`)
- PDM (`pyproject.toml`)

### Testing
Works alongside:
- pytest
- unittest
- nose2
- tox

### Linting
Compatible with:
- pylint
- flake8
- black
- ruff

## Best Practices

1. **Protect Core Modules**
   - Database models
   - Core business logic
   - Configuration files
   - Migration scripts

2. **Monitor API Changes**
   - Endpoint definitions
   - Schema changes
   - Authentication logic

3. **Track Dependencies**
   - requirements.txt updates
   - Poetry/Pipfile changes
   - Version constraints

4. **Use Decision Queries**
   - Before major refactoring
   - When changing frameworks
   - To avoid deprecated patterns

## Common Scenarios

### Adding a New Model
```bash
# Before creating, check for similar models
node ~/Projects/claude-memory-intelligence/decision-query.js --search "user model"

# Create model and migration...

# Memory automatically tracks both
```

### Refactoring Services
```bash
# Check current service patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --domain services

# Refactor following patterns...

# Memory captures the changes
```

### API Versioning
```bash
# Document versioning decision
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain api \
  --decision "Implement API v2 with backward compatibility" \
  --rationale "Support existing clients while rolling out new features"
```

## Troubleshooting

### Virtual Environment Issues
Ensure venv is ignored:
```json
{
  "boundaries": {
    "ignored": [
      "venv/**",
      ".venv/**",
      "env/**"
    ]
  }
}
```

### Migration Tracking
If migrations aren't being tracked:
```json
{
  "boundaries": {
    "protected": [
      "alembic/versions/**/*.py",
      "migrations/versions/**/*.py",
      "app/migrations/**/*.py"
    ]
  }
}
```

### Performance with Large Codebases
For large Python projects:
```json
{
  "performance": {
    "updateThrottleMs": 200,
    "maxConcurrentUpdates": 3
  },
  "boundaries": {
    "ignored": [
      "tests/**",
      "docs/**"
    ]
  }
}
```

## Framework-Specific Guides

### Django
```bash
# Protect Django-specific files
{
  "boundaries": {
    "protected": [
      "manage.py",
      "app/settings.py",
      "app/settings/**/*.py",
      "app/wsgi.py",
      "app/asgi.py"
    ]
  }
}
```

### FastAPI
```bash
# Protect FastAPI-specific files
{
  "boundaries": {
    "protected": [
      "app/main.py",
      "app/dependencies.py",
      "app/core/security.py"
    ]
  }
}
```

### Flask
```bash
# Protect Flask-specific files
{
  "boundaries": {
    "protected": [
      "app/__init__.py",
      "app/config.py",
      "wsgi.py"
    ]
  }
}
```

## Migration Guides

### Django Upgrade
```bash
# Document Django upgrade
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain framework \
  --decision "Upgrade Django 4.2 → 5.0" \
  --rationale "Security updates, async ORM, better type hints"
```

### Async Migration
```bash
# Document async migration
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain architecture \
  --decision "Convert synchronous views to async" \
  --rationale "Improve performance for I/O-bound operations"
```

## Support

- Python Docs: https://docs.python.org
- Django: https://docs.djangoproject.com
- FastAPI: https://fastapi.tiangolo.com
- Flask: https://flask.palletsprojects.com
- Memory Intelligence: `~/Projects/claude-memory-intelligence/README.md`

## License

MIT License - Use freely in your Python projects
