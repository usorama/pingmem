# Claude Memory Intelligence - Core Scripts

This directory contains the extracted and generalized memory system scripts from PingLearn, made project-agnostic and reusable for any codebase.

## 📂 Directory Structure

```
core/
├── scripts/               # Executable scripts
│   ├── decision-query.js         # Query decision records
│   ├── generate-codebase-map.js  # Generate codebase structure map
│   ├── init-memory.js            # Initialize memory system in project
│   └── health-check.js           # Verify system health
├── lib/                   # Reusable libraries
│   ├── ollama-client.js          # LLM client for intent enhancement
│   ├── config-loader.js          # Configuration loading utility
│   ├── file-tracker.js           # Track file changes
│   └── boundary-validator.js     # Validate protected boundaries
├── hooks/                 # Event hooks (to be populated)
└── schemas/              # JSON schemas (to be populated)
```

## 🚀 Scripts

### 1. init-memory.js

Initialize the memory system in a project.

**Usage:**
```bash
node core/scripts/init-memory.js [--force]
```

**What it does:**
- Creates `.memories/` directory structure
- Sets up decision tracking folders by domain
- Generates initial configuration files
- Creates template decision records
- Generates initial codebase map
- Updates .gitignore

**Example:**
```bash
cd /path/to/your/project
node /path/to/claude-memory-intelligence/core/scripts/init-memory.js
```

---

### 2. decision-query.js

Query decision records with various filters.

**Usage:**
```bash
node decision-query.js [options]

Options:
  --id <decision-id>              Query by decision ID
  --domain <domain>               Query by domain (auth, database, etc.)
  --tag <tag>                     Query by tag
  --min-confidence <score>        Filter by minimum confidence (0.0-1.0)
  --check-deprecated <pattern>    Check if pattern is deprecated
  --find-canonical <topic>        Find canonical docs for topic
  --search <keyword>              Search for keyword
  --migration-status              Show migration status summary
  --list-all                      List all decisions (summary)
  --verbose                       Show full details
```

**Examples:**
```bash
# Check if pattern is deprecated
node decision-query.js --check-deprecated "OLD_API_KEY"

# Find decisions by domain
node decision-query.js --domain auth --verbose

# Search for keyword
node decision-query.js --search "authentication"

# Show migration status
node decision-query.js --migration-status
```

---

### 3. generate-codebase-map.js

Generate comprehensive codebase structure map.

**Usage:**
```bash
node generate-codebase-map.js [--output path] [--config path]
```

**What it generates:**
- Directory structure with purposes
- Tech stack detection (from package.json)
- Protected boundaries
- Modifiable directories
- Recent git changes
- Key files (CLAUDE.md, README.md, etc.)

**Example:**
```bash
# Generate default map
node generate-codebase-map.js

# Custom output location
node generate-codebase-map.js --output /custom/path/codebase-map.json

# Use custom config
node generate-codebase-map.js --config .claude/config/custom-scan.json
```

---

### 4. health-check.js

Verify memory system installation and health.

**Usage:**
```bash
node health-check.js [--verbose]
```

**Checks:**
- Directory structure integrity
- Configuration file validity
- Ollama availability (for LLM enhancement)
- Decision records count
- Codebase map freshness
- Script availability

**Example:**
```bash
# Basic health check
node health-check.js

# Verbose output with details
node health-check.js --verbose
```

---

## 📚 Libraries

### ollama-client.js

LLM client for hybrid intent analysis.

**Features:**
- Health check caching
- Timeout protection (configurable)
- Graceful error handling
- Connection pooling
- Performance metrics tracking

**Usage:**
```javascript
const OllamaClient = require('./core/lib/ollama-client');

// Check availability
const available = await OllamaClient.isAvailable();

// Enhance intent
const enhanced = await OllamaClient.enhanceIntent(userPrompt, regexResult, availableDomains);

// Get status
const status = OllamaClient.getStatus();
```

---

### config-loader.js

Centralized configuration loading with merging and validation.

**Features:**
- Multiple source merging (defaults → project → user)
- Environment variable override support
- Validation and error handling
- Config caching for performance

**Usage:**
```javascript
const ConfigLoader = require('./core/lib/config-loader');

// Load configuration
const config = ConfigLoader.loadConfig();

// Access paths
const decisionsDir = ConfigLoader.getDecisionsDir(config);
const codebaseMapPath = ConfigLoader.getCodebaseMapPath(config);
```

---

### file-tracker.js

Track file changes and update codebase map.

**Features:**
- File modification tracking
- Directory structure monitoring
- Change detection
- Auto-update triggers

**Usage:**
```javascript
const FileTracker = require('./core/lib/file-tracker');

// Track a change
FileTracker.trackChange('/path/to/file.ts', 'write');

// Get pending changes
const changes = FileTracker.getPendingChanges();

// Flush to disk
FileTracker.flushChanges();

// Mark files as tracked
FileTracker.markTracked(['/path/to/file1.ts', '/path/to/file2.ts']);
```

---

### boundary-validator.js

Validate file operations against protected boundaries.

**Features:**
- Protected path checking
- Pattern matching (glob support)
- Violation detection
- Auto-blocking capabilities

**Usage:**
```javascript
const BoundaryValidator = require('./core/lib/boundary-validator');

// Validate single file
const result = BoundaryValidator.validate('/path/to/file.ts', 'write');
if (!result.allowed) {
  console.log('Violation:', result.reason);
}

// Validate multiple files
const batchResult = BoundaryValidator.validateBatch(filePaths, 'write');

// Check if directory is protected
const isProtected = BoundaryValidator.isProtectedDirectory('/src/protected-core');
```

---

## 🔧 Configuration

### LLM Enhancement Config (`.claude/config/llm-enhancement.json`)

```json
{
  "enabled": true,
  "ollama": {
    "host": "http://127.0.0.1:11434",
    "model": "llama3.2:1b",
    "timeout_ms": 2000,
    "health_check_ttl_ms": 300000
  },
  "fallback": {
    "mode": "regex_only",
    "log_failures": true
  },
  "performance": {
    "cache_health_checks": true,
    "reuse_client": true,
    "max_retries": 1
  }
}
```

### Codebase Scan Config (`.claude/config/codebase-scan.json`)

```json
{
  "project_name": "YourProjectName",
  "project_description": "Your project description",
  "protected_boundaries": [
    "src/core/**",
    "src/protected/**"
  ],
  "analyze_dirs": [
    "src",
    "docs",
    "scripts"
  ],
  "ignore_dirs": [
    "node_modules",
    ".next",
    "dist",
    "build"
  ],
  "tech_stack_detection": {
    "enabled": true,
    "package_files": ["package.json", "requirements.txt"]
  },
  "scan_depth": 2
}
```

---

## 📋 Decision Record Schema

Decision records are stored in `.memories/decisions/{domain}/{decision-id}.json`

**Template:**
```json
{
  "decision_id": "DEC-DOMAIN-YYYYMMDD-NNN",
  "title": "Decision title",
  "context": "Background and circumstances",
  "decision": "What was decided",
  "rationale": "Why this decision was made",
  "alternatives": [
    {
      "option": "Alternative approach",
      "rejected_because": "Reason for rejection"
    }
  ],
  "implementation": {
    "how_to": "Step-by-step guide",
    "anti_patterns": [
      {
        "pattern": "Pattern to avoid",
        "why_wrong": "Why it's wrong",
        "correct_alternative": "Correct pattern"
      }
    ]
  },
  "migration": {
    "old_pattern": "Deprecated pattern",
    "new_pattern": "New pattern",
    "deprecation_date": "2025-01-01",
    "migration_deadline": "2025-06-01",
    "status": "PENDING",
    "implementation_guide": "Migration steps"
  },
  "confidence_score": 0.95,
  "validation_status": "VALIDATED",
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "created_by": "system",
    "tags": ["tag1", "tag2"],
    "related_decisions": [],
    "documentation_links": [
      {
        "title": "Official Docs",
        "url": "https://example.com",
        "canonicality_score": 1.0
      }
    ]
  }
}
```

---

## 🎯 Usage Patterns

### Pattern 1: Initialize in New Project

```bash
# 1. Install dependencies
npm install minimatch

# 2. Initialize memory system
node /path/to/core/scripts/init-memory.js

# 3. Verify installation
node .claude/scripts/health-check.js

# 4. Generate codebase map
node .claude/scripts/generate-codebase-map.js
```

### Pattern 2: Query Decisions

```bash
# Check if using deprecated pattern
node .claude/scripts/decision-query.js --check-deprecated "OLD_API"

# Find all auth-related decisions
node .claude/scripts/decision-query.js --domain auth --verbose

# Search by keyword
node .claude/scripts/decision-query.js --search "database migration"
```

### Pattern 3: Track File Changes

```javascript
// In your hook or automation
const FileTracker = require('./core/lib/file-tracker');
const BoundaryValidator = require('./core/lib/boundary-validator');

// Validate before writing
const validation = BoundaryValidator.validate(filePath, 'write');
if (!validation.allowed) {
  throw new Error(`Protected boundary violation: ${validation.reason}`);
}

// Track the change
FileTracker.trackChange(filePath, 'write', { reason: 'User requested' });
```

---

## 🔄 Generalizations Made

From PingLearn-specific to project-agnostic:

1. **Dynamic Project Root Detection**
   - Removed hardcoded paths
   - Auto-detect project root via `.memories` or `.claude` directories

2. **Configurable Boundaries**
   - Removed PingLearn-specific protected paths
   - Load from configuration files instead

3. **Generic Domain Names**
   - Changed from PingLearn domains to common ones (auth, database, api, ui, etc.)
   - Configurable via decision tracking system

4. **Tech Stack Detection**
   - Auto-detect from package.json, requirements.txt, etc.
   - No hardcoded framework assumptions

5. **Flexible Directory Structure**
   - Analyze any directories specified in config
   - Auto-detect if not configured

---

## 📦 Dependencies

### Required
- `minimatch` - Glob pattern matching for boundary validation

### Optional
- `ollama` - LLM enhancement (fallback to regex if unavailable)

Install with:
```bash
npm install minimatch
npm install --save-optional ollama
```

---

## 🚦 Next Steps

After extracting these scripts:

1. ✅ Scripts extracted and generalized
2. ✅ Configuration templates created
3. ✅ Dependencies documented
4. 🔲 Create hooks (PostToolUse, UserPromptSubmit, etc.)
5. 🔲 Create installers for different environments
6. 🔲 Add tests
7. 🔲 Create comprehensive documentation

---

## 📝 Notes

- All scripts are project-agnostic and work without PingLearn-specific assumptions
- Configuration is loaded dynamically with sensible defaults
- Scripts fail gracefully when dependencies are missing
- Ollama is optional - system falls back to regex-only mode
