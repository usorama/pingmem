# Claude Memory Intelligence - Architecture

## System Overview

Claude Memory Intelligence is a four-layer memory system designed to provide persistent context and decision tracking for AI coding assistants.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER / AI ASSISTANT                         │
│            (Claude Code, GitHub Copilot, etc.)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Prompts & File Operations
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      EVENT HOOKS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ UserPromptSubmit│  │ PostToolUse  │  │ DecisionCapture  │   │
│  │                 │  │              │  │                  │   │
│  │ • Intent analysis│  │ • File tracking│ • Decision extract│  │
│  │ • Context inject│  │ • Map update  │  • Validation     │   │
│  │ • LLM enhance   │  │ • Background  │  • ID generation  │   │
│  │   (optional)    │  │   scanning    │  │                  │   │
│  └────────┬────────┘  └──────┬───────┘  └────────┬─────────┘   │
│           │                  │                    │             │
└───────────┼──────────────────┼────────────────────┼─────────────┘
            │                  │                    │
            ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CORE LIBRARIES LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ConfigLoader  │  │FileTracker   │  │BoundaryValidator  │     │
│  │              │  │              │  │                   │     │
│  │• Load config │  │• Track changes│ │• Validate paths   │     │
│  │• Merge       │  │• Hash files  │  │• Glob matching    │     │
│  │  defaults    │  │• Queue       │  │• Block violations │     │
│  │• Path resolve│  │  updates     │  │                   │     │
│  └──────────────┘  └──────────────┘  └───────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               OllamaClient (Optional)                    │  │
│  │                                                          │  │
│  │  • LLM intent enhancement                               │  │
│  │  • Health check caching                                 │  │
│  │  • Graceful fallback to regex                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY STORAGE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Decision Intelligence                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  .memories/decisions/                                  │    │
│  │  ├── architecture/                                     │    │
│  │  ├── database/                                         │    │
│  │  ├── api/                                              │    │
│  │  ├── ui/                                               │    │
│  │  └── infrastructure/                                   │    │
│  │                                                        │    │
│  │  Each decision record contains:                        │    │
│  │  • WHY decision was made (rationale)                   │    │
│  │  • HOW to implement (step-by-step)                     │    │
│  │  • WHAT NOT TO DO (anti-patterns)                      │    │
│  │  • Deprecation tracking                                │    │
│  │  • Migration guides                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Layer 3: Validation & Quality Gates                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  .memories/validated/                                  │    │
│  │  ├── protected-core-boundaries.md                      │    │
│  │  ├── type-safety-rules.md                              │    │
│  │  └── workflow-requirements.md                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Layer 1-2: Codebase Tracking                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  .memories/                                            │    │
│  │  ├── codebase-map.json  (auto-updated)                │    │
│  │  ├── last-updated.json  (timestamps)                  │    │
│  │  └── .pending-changes.log                             │    │
│  │                                                        │    │
│  │  codebase-map.json contains:                           │    │
│  │  • Project structure and purposes                      │    │
│  │  • Tech stack (auto-detected)                          │    │
│  │  • Protected boundaries                                │    │
│  │  • Modifiable directories                              │    │
│  │  • Recent changes (from git)                           │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. User Prompt Submission Flow

```
User types prompt
       ↓
UserPromptSubmit Hook Triggered
       ↓
┌──────────────────────────────┐
│ 1. Analyze Intent            │
│    • Regex: Extract domains, │
│      tags, operations        │
│    • LLM (optional): Enhance │
│      accuracy to 95%+        │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 2. Query Decision Records    │
│    • Match by domain         │
│    • Match by tags           │
│    • Filter by confidence    │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 3. Inject Context            │
│    • Append relevant         │
│      decisions to prompt     │
│    • Include deprecations    │
│    • Add anti-patterns       │
└──────────┬───────────────────┘
           ↓
AI receives enriched prompt with memory context
```

### 2. File Operation Flow

```
AI writes/edits file
       ↓
PostToolUse Hook Triggered
       ↓
┌──────────────────────────────┐
│ 1. Extract File Path         │
│    • From Write args         │
│    • From Edit args          │
│    • From MultiEdit args     │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 2. Validate Boundaries       │
│    • Check protected paths   │
│    • Glob pattern matching   │
│    • Block if violation      │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 3. Update Memory             │
│    • Update codebase-map.json│
│    • Log change timestamp    │
│    • Queue for scanning      │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 4. Background Scan (optional)│
│    • File-level analysis     │
│    • Dependency detection    │
│    • Export tracking         │
└──────────────────────────────┘
```

### 3. Decision Query Flow

```
Query decision by domain/tag/keyword
       ↓
DecisionQuery Script
       ↓
┌──────────────────────────────┐
│ 1. Load Decision Records     │
│    • Scan decisions/         │
│      directory recursively   │
│    • Parse JSON files        │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 2. Apply Filters             │
│    • Domain match            │
│    • Tag match               │
│    • Confidence threshold    │
│    • Keyword search          │
└──────────┬───────────────────┘
           ↓
┌──────────────────────────────┐
│ 3. Return Results            │
│    • Sorted by relevance     │
│    • Include metadata        │
│    • Show migration status   │
└──────────────────────────────┘
```

---

## Component Interaction

### Configuration Loading

```
┌─────────────────────────────────────────────────────────┐
│                   ConfigLoader                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Loads configuration from multiple sources:             │
│                                                         │
│  1. Default Config (hardcoded)                          │
│     ↓ Deep Merge                                        │
│  2. Template Config (from templates/)                   │
│     ↓ Deep Merge                                        │
│  3. Project Config (.memory-config.json)                │
│     ↓ Deep Merge                                        │
│  4. Environment Variables (CLAUDE_*)                    │
│                                                         │
│  Result: Unified configuration object                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Used by all components for:
• File paths resolution
• Feature toggles
• Performance tuning
• Behavior customization
```

### Boundary Validation

```
┌─────────────────────────────────────────────────────────┐
│                BoundaryValidator                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Protected Paths (from config):                         │
│  ├── src/protected-core/**                              │
│  ├── middleware.ts                                      │
│  ├── next.config.js                                     │
│  └── prisma/schema.prisma                               │
│                                                         │
│  Operations:                                            │
│  ┌──────────────────┬──────────────────────────┐        │
│  │ Operation        │ Protected Paths          │        │
│  ├──────────────────┼──────────────────────────┤        │
│  │ read             │ ✅ Allowed               │        │
│  │ write            │ ❌ Blocked               │        │
│  │ delete           │ ❌ Blocked               │        │
│  └──────────────────┴──────────────────────────┘        │
│                                                         │
│  Validation Algorithm:                                  │
│  1. Normalize file path                                 │
│  2. Check against protected patterns (minimatch)        │
│  3. Return { allowed: boolean, reason: string }         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### File Tracking

```
┌─────────────────────────────────────────────────────────┐
│                   FileTracker                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Change Detection:                                      │
│  ┌──────────────────────────────────────────────┐      │
│  │ File Modified                                │      │
│  │   ↓                                          │      │
│  │ Calculate Hash (SHA-256)                     │      │
│  │   ↓                                          │      │
│  │ Compare with Previous Hash                   │      │
│  │   ↓                                          │      │
│  │ If Changed:                                  │      │
│  │   • Update hash registry                     │      │
│  │   • Add to pending changes queue             │      │
│  │   • Trigger codebase map update              │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
│  Pending Changes Queue:                                 │
│  • Batch processing (every 100ms)                       │
│  • Max 5 concurrent updates                             │
│  • Throttling to prevent overload                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

### Hook Latency

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  UserPromptSubmit Hook                                 │
│  ┌──────────────────────────────────────────────┐    │
│  │ Regex Analysis:        <50ms   ████          │    │
│  │ LLM Enhancement:       <500ms  ████████████  │    │
│  │ Decision Query:        <10ms   ██            │    │
│  │ Context Injection:     <5ms    █             │    │
│  │                                              │    │
│  │ Total (Regex):         <65ms                 │    │
│  │ Total (LLM):           <565ms                │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  PostToolUse Hook                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Path Extraction:       <1ms    █             │    │
│  │ Boundary Validation:   <1ms    █             │    │
│  │ Map Update (folder):   <50ms   ████          │    │
│  │ Map Update (file):     <500ms  ██████████    │    │
│  │                                              │    │
│  │ Total (sync):          <100ms                │    │
│  │ Background scan:       <500ms (non-blocking) │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Memory Footprint

```
Component                Memory Usage
────────────────────────────────────
ConfigLoader             ~2 MB
OllamaClient            ~5 MB
FileTracker             ~3 MB
BoundaryValidator       ~1 MB
Decision Records        ~2-5 MB (depends on count)
Codebase Map            ~1-3 MB (depends on size)
────────────────────────────────────
Total                   ~15-20 MB
```

---

## Scalability

### Project Size Support

```
Small Projects (<100 files):
├── Codebase Map Generation: <1s
├── Decision Query: <5ms
└── Memory Update: <50ms

Medium Projects (100-1000 files):
├── Codebase Map Generation: 1-3s
├── Decision Query: <10ms
└── Memory Update: <100ms

Large Projects (1000-10000 files):
├── Codebase Map Generation: 3-10s
├── Decision Query: <20ms
└── Memory Update: <200ms

Very Large Projects (>10000 files):
├── Codebase Map Generation: 10-30s
├── Decision Query: <50ms
└── Memory Update: <500ms
```

### Optimization Strategies

**For Large Codebases:**
- Background scanning (non-blocking)
- Incremental map updates (only changed directories)
- Decision caching (1-hour TTL)
- Throttled file tracking (max 5 concurrent)
- Configurable scan depth

**For Network Operations:**
- Local-first design (no cloud dependencies)
- Optional Ollama (runs locally)
- Graceful fallback to regex

---

## Security Considerations

### Data Privacy

```
All data is stored locally:
├── .memories/ (project-specific)
├── .memory-config.json (project-specific)
└── No cloud sync (optional in v2.0)

No data leaves your machine unless:
├── You commit to version control
└── You enable cloud sync (future feature)
```

### Protected Boundaries

```
Prevents accidental modification of:
├── Core business logic
├── Database schemas
├── Configuration files
├── Middleware and routing
└── Any user-defined protected paths
```

### Validation

```
All file operations are validated:
├── Path normalization (prevent path traversal)
├── Pattern matching (prevent bypasses)
├── Operation type checking (read/write/delete)
└── Glob expansion (safe pattern matching)
```

---

## Extension Points

### Adding New Hooks

```javascript
// Create hook file
// core/hooks/your-hook.js

const configLoader = require('../lib/config-loader');

async function handleYourEvent(eventData) {
  const config = configLoader.loadConfig();

  // Your hook logic here

  return result;
}

module.exports = handleYourEvent;
```

### Adding New Templates

```javascript
// Create template directory
templates/your-template/
├── .memory-config.json
├── README.md
└── .gitignore

// Update template index
templates/README.md
```

### Adding New Scripts

```javascript
// Create script file
// core/scripts/your-script.js

#!/usr/bin/env node

const configLoader = require('../lib/config-loader');

async function main() {
  const config = configLoader.loadConfig();

  // Your script logic here
}

main().catch(console.error);
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────┐
│              Node.js ≥16.0.0                    │
├─────────────────────────────────────────────────┤
│  Runtime Platform                               │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│         Core Dependencies                       │
├─────────────────────────────────────────────────┤
│  • minimatch (glob pattern matching)            │
│  • fs/promises (file system operations)         │
│  • path (path manipulation)                     │
│  • crypto (hashing)                             │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│         Optional Dependencies                   │
├─────────────────────────────────────────────────┤
│  • ollama (LLM enhancement)                     │
└─────────────────────────────────────────────────┘
```

---

## Future Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────┐
│                  Web UI Layer (NEW)                     │
│  ┌──────────────────────────────────────────────┐      │
│  │ Decision Browser                             │      │
│  │ Analytics Dashboard                          │      │
│  │ Configuration Editor                         │      │
│  └──────────────────────────────────────────────┘      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 VS Code Extension (NEW)                 │
│  ┌──────────────────────────────────────────────┐      │
│  │ Inline Decision Preview                      │      │
│  │ Quick Decision Lookup                        │      │
│  │ Boundary Violation Warnings                  │      │
│  └──────────────────────────────────────────────┘      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Existing Core System (v1.0)                │
└─────────────────────────────────────────────────────────┘
```

---

For more details, see:
- [README.md](README.md) - Main documentation
- [QUICK-START.md](QUICK-START.md) - Getting started guide
- [core/README.md](core/README.md) - Core scripts reference
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guide
