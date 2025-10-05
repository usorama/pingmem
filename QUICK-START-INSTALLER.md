# Quick Start - Ollama Installer

**For impatient users who just want to get started**

---

## 🚀 Installation (Choose One)

### Option 1: Bash (macOS/Linux) - Recommended

```bash
cd ~/Projects/claude-memory-intelligence
./install.sh
```

Press ENTER when prompted, accept defaults.
**Time**: 5-10 minutes
**Downloads**: ~1GB

### Option 2: Node.js (All Platforms)

```bash
cd ~/Projects/claude-memory-intelligence
node install.js
```

Press ENTER when prompted, accept defaults.
**Time**: 5-10 minutes
**Downloads**: ~1GB

---

## ⚡ That's It!

After installation completes, you'll see:

```
✅ INSTALLATION COMPLETE

Memory System Configuration:
  Mode:     Hybrid (LLM + Regex)
  Model:    qwen2.5-coder:1.5b
  Endpoint: http://localhost:11434
  Fallback: Regex patterns enabled
```

**Your memory system is now using enhanced LLM-based intent analysis!**

---

## 🧪 Test It (Optional)

```bash
# Verify Ollama is running
ollama --version

# List installed models
ollama list

# Check configuration
cat .memories/.llm-config.json
```

---

## 🆘 Troubleshooting

### If installation fails:
**Don't worry!** The system automatically falls back to regex-only mode (still works, just ~70% accuracy instead of ~94.8%).

### To retry:
```bash
./install.sh
# or
node install.js
```

Safe to run multiple times.

### To test without installing:
```bash
./install.sh --dry-run
```

---

## 📚 More Information

- **Full Guide**: [INSTALLER-GUIDE.md](INSTALLER-GUIDE.md)
- **Known Issues**: [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md)
- **Quick Reference**: [installers/README.md](installers/README.md)

---

**That's it! Enjoy enhanced intent analysis.**
