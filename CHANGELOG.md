# Changelog

All notable changes to Claude Memory Intelligence will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Web UI for decision browsing
- VS Code extension
- Decision analytics dashboard
- Multi-language support (i18n)
- Cloud sync for decision records

## [1.0.0] - 2025-10-05

### Added

#### Core System
- Four-layer memory architecture (Codebase Tracking, Validation, Decision Intelligence)
- Automatic memory updates via PostToolUse hook (<100ms latency)
- Smart context injection via UserPromptSubmit hook
- Git integration for change tracking
- Background file scanning (non-blocking)

#### Scripts
- `init-memory.js` - Initialize memory system in any project
- `generate-codebase-map.js` - Auto-generate project structure map
- `decision-query.js` - Query and search decision records
- `health-check.js` - Comprehensive system health verification

#### Libraries
- `config-loader.js` - Configuration management with deep merging
- `ollama-client.js` - LLM client for hybrid intent analysis
- `file-tracker.js` - Real-time file change tracking
- `boundary-validator.js` - Protected path enforcement

#### Hooks
- `user-prompt-submit.js` - Auto-inject relevant decision context
- `post-tool-use.js` - Auto-update memory after file operations
- `decision-capture.js` - Interactive decision record capture

#### Templates
- Default template - Generic/flexible configuration
- Next.js template - Optimized for Next.js applications
- React template - Optimized for React SPAs
- Python template - Optimized for Python projects

#### Features
- Hybrid LLM + heuristic intent analysis
- Optional Ollama integration (graceful fallback to regex)
- Protected boundary system with glob pattern support
- Deprecation tracking and migration guides
- Decision confidence scoring
- Validation status tracking
- Anti-pattern documentation
- Canonical documentation linking

#### Documentation
- Comprehensive README.md with examples
- Quick Start Guide (60-second setup)
- Template comparison documentation
- Hook reference guide
- Contributing guidelines
- Extraction and generalization summaries
- Verification report

### Changed
- Extracted and generalized from PingLearn project
- Made fully project-agnostic (works with any codebase)
- Configuration-driven design (no hardcoded assumptions)
- Universal tech stack support (Node.js, Python, Go, Rust, etc.)

### Performance
- PostToolUse hook: <100ms
- UserPromptSubmit (regex): <50ms
- UserPromptSubmit (LLM): <500ms
- Decision query: <10ms
- Boundary validation: <1ms
- Memory footprint: ~15-20 MB

### Dependencies
- Required: `minimatch` ^9.0.3
- Optional: `ollama` ^0.5.0
- Minimum Node.js: 16.0.0

---

## Release Notes

### Version 1.0.0 - "Genesis"

This is the initial release of Claude Memory Intelligence, extracted and generalized from the PingLearn AI learning platform's Layer 4 Decision Intelligence System.

**Highlights:**
- ✅ Production-ready memory system for AI coding assistants
- ✅ Works with ANY project type (Next.js, React, Python, Go, etc.)
- ✅ Zero-maintenance automatic updates
- ✅ Optional LLM enhancement with graceful fallback
- ✅ Four comprehensive project templates
- ✅ Complete documentation and guides

**Migration Path:**
This is the first public release. No migration needed.

**Breaking Changes:**
None (initial release)

**Known Issues:**
None

**Contributors:**
- Claude Memory Intelligence Team

---

## How to Update

### From Source
```bash
cd ~/Projects/claude-memory-intelligence
git pull origin main
npm install
```

### From NPM (when published)
```bash
npm update -g claude-memory-intelligence
```

### Verify Update
```bash
claude-memory-check --version
```

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-10-05 | Initial release |

---

## Links

- [Homepage](https://github.com/yourusername/claude-memory-intelligence)
- [Documentation](https://github.com/yourusername/claude-memory-intelligence/blob/main/README.md)
- [Issue Tracker](https://github.com/yourusername/claude-memory-intelligence/issues)
- [Release Notes](https://github.com/yourusername/claude-memory-intelligence/releases)

---

[Unreleased]: https://github.com/yourusername/claude-memory-intelligence/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/claude-memory-intelligence/releases/tag/v1.0.0
