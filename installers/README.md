# Ollama Installer Scripts - Quick Reference

## 🚀 Quick Start

```bash
# Bash (macOS/Linux)
./install.sh

# Node.js (cross-platform)
node install.js
```

## 📋 Options

| Option | Description |
|--------|-------------|
| `--help` | Show usage information |
| `--dry-run` | Test without making changes |

## 📖 Documentation

For complete documentation, see: [INSTALLER-GUIDE.md](../INSTALLER-GUIDE.md)

## ✅ What Gets Installed

### Full Installation (LLM Mode)
- Ollama runtime (~100MB)
- qwen2.5-coder:1.5b model (~1GB)
- Memory system config (hybrid mode)
- **Accuracy**: ~94.8%

### Fallback (Regex-Only Mode)
- Memory system config (regex-only mode)
- No dependencies
- **Accuracy**: ~70%

## 🔧 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8GB | 16GB |
| Disk | 12GB | 50GB |
| OS | macOS 10.15+ / Linux / WSL2 | - |
| Network | Broadband | - |

## 🎯 Common Commands

```bash
# Test installation
./install.sh --dry-run

# View help
./install.sh --help

# Verify Ollama
ollama --version
ollama list

# Check configuration
cat .memories/.llm-config.json
```

## 🔄 Re-running Installer

Safe to run multiple times. Will:
- Skip if already installed
- Update configuration
- Verify components

## ❌ Troubleshooting

### Ollama won't start
```bash
# Check port
lsof -i :11434

# Restart server
ollama serve
```

### Model download fails
```bash
# Retry manually
ollama pull qwen2.5-coder:1.5b
```

### Switch to fallback mode
```bash
# Edit config
cat > .memories/.llm-config.json <<EOF
{"mode": "regex-only", "llm": {"enabled": false}, "regex": {"enabled": true}}
EOF
```

## 📁 Files Created

```
.memories/
└── .llm-config.json    # Memory system configuration
```

## 🔒 Known Limitations

- ❌ Windows native not supported (use WSL)
- ⚠️  Requires 8GB+ RAM for LLM mode
- ⚠️  Requires network for initial download
- ✅ Fallback mode always works

---

**For detailed documentation**: See [INSTALLER-GUIDE.md](../INSTALLER-GUIDE.md)
