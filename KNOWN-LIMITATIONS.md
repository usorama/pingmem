# Known Limitations - Ollama Installer

**Version**: 1.0
**Last Updated**: October 5, 2025
**Status**: Production

---

## 📋 Overview

This document lists all known limitations, edge cases, and constraints of the Ollama installer scripts for Claude Memory Intelligence.

---

## 🖥️ Platform Limitations

### ❌ Windows Native (Not Supported)

**Issue**: Bash installer cannot run on native Windows.

**Affected**:
- Windows 10/11 (native)
- PowerShell environments
- CMD environments

**Workarounds**:
1. **Use WSL2** (Recommended):
   ```bash
   # Inside WSL2
   ./install.sh
   ```

2. **Use Node.js Installer**:
   ```bash
   # Windows PowerShell/CMD
   node install.js
   ```
   Note: Still requires manual Ollama download from https://ollama.com/download

3. **Use Fallback Mode**:
   - Works everywhere, no Ollama needed
   - ~70% accuracy vs 94.8%

**Status**: Won't fix (Windows users should use WSL2 or Node.js installer)

---

### ⚠️  WSL (Limited Performance)

**Issue**: WSL adds performance overhead compared to native Linux.

**Impact**:
- 10-20% slower model loading
- Higher memory usage
- Potential I/O bottlenecks

**Affected**:
- WSL1 (severe impact)
- WSL2 (moderate impact)

**Workarounds**:
1. **Use WSL2** (not WSL1):
   ```bash
   wsl --set-default-version 2
   ```

2. **Increase WSL2 Memory**:
   ```powershell
   # .wslconfig file
   [wsl2]
   memory=8GB
   ```

3. **Use SSD for WSL filesystem**

**Status**: Limitation of WSL architecture

---

### ⚠️  ARM Architecture (Limited Support)

**Issue**: Ollama has limited support for ARM Linux.

**Affected**:
- Linux ARM64 (Raspberry Pi, etc.)
- Some ARM-based servers

**Not Affected**:
- macOS ARM64 (Apple Silicon) - Full support ✅

**Workarounds**:
1. **Check Ollama Compatibility**:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   # Will fail if unsupported
   ```

2. **Use Fallback Mode**:
   - Always works on any architecture

**Status**: Depends on Ollama upstream support

---

## 💾 Resource Limitations

### ⚠️  Low RAM Systems (<8GB)

**Issue**: Model may not load or run slowly.

**Symptoms**:
- Model loading fails
- System becomes unresponsive
- Excessive swap usage
- OOM (Out of Memory) errors

**Impact Levels**:
- **4GB RAM**: ❌ Cannot run model
- **6GB RAM**: ⚠️  Model may load but swap heavily
- **8GB RAM**: ✅ Minimum, works but slow
- **16GB RAM**: ✅ Recommended, smooth operation

**Workarounds**:
1. **Close Other Applications**:
   - Free up RAM before running

2. **Use Smaller Model**:
   ```bash
   ollama pull qwen2.5-coder:0.5b  # 512MB vs 1GB
   ```

3. **Increase Swap Space** (Linux):
   ```bash
   sudo fallocate -l 8G /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **Use Fallback Mode**:
   - No RAM overhead
   - Works on any system

**Status**: Hardware limitation

---

### ⚠️  Low Disk Space (<12GB)

**Issue**: Cannot download model.

**Breakdown**:
- Ollama binary: ~100MB
- qwen2.5-coder:1.5b model: ~1GB
- Model cache: ~2GB
- System overhead: ~8GB

**Impact**:
- **<1GB**: ❌ Cannot install Ollama
- **1-5GB**: ⚠️  Can install Ollama, cannot download model
- **5-12GB**: ⚠️  Can download model, limited cache
- **>12GB**: ✅ Recommended

**Workarounds**:
1. **Free Disk Space**:
   ```bash
   # Find large files
   du -sh * | sort -h

   # Clean package caches
   npm cache clean --force
   brew cleanup  # macOS
   sudo apt-get clean  # Linux
   ```

2. **Use Smaller Model**:
   ```bash
   ollama pull qwen2.5-coder:0.5b
   ```

3. **Use Fallback Mode**:
   - <1MB config file only

**Status**: Hardware limitation

---

### ⚠️  HDD vs SSD Storage

**Issue**: HDD is 10x slower than SSD for model loading.

**Impact**:
- **SSD**: Model loads in 1-2 seconds ✅
- **HDD**: Model loads in 10-20 seconds ⚠️

**Not a Blocker**:
- Installer still works
- Model still runs
- Just slower initial load

**Workaround**:
- Use SSD if possible
- Be patient on HDD systems

**Status**: Expected behavior

---

## 🌐 Network Limitations

### ❌ Offline Installation

**Issue**: Cannot download Ollama or model without internet.

**Required Downloads**:
1. Ollama installer (~100MB)
2. qwen2.5-coder:1.5b model (~1GB)

**Workarounds**:
1. **Pre-download on Another Machine**:
   ```bash
   # Download on internet-connected machine
   ollama pull qwen2.5-coder:1.5b

   # Copy model cache to offline machine
   # Model location: ~/.ollama/models/
   ```

2. **Use Fallback Mode**:
   - Works 100% offline
   - No downloads needed

**Status**: Expected limitation

---

### ⚠️  Slow Network Connections

**Issue**: Model download may timeout on slow connections.

**Symptoms**:
- Download stalls
- Timeout errors
- Partial downloads

**Impact by Speed**:
- **<1 Mbps**: ❌ Likely to timeout
- **1-5 Mbps**: ⚠️  May timeout (20+ minutes)
- **5-10 Mbps**: ✅ Works (5-10 minutes)
- **>10 Mbps**: ✅ Fast (<5 minutes)

**Workarounds**:
1. **Increase Timeout** (if manually pulling):
   ```bash
   # Ollama doesn't have timeout config
   # But you can retry:
   ollama pull qwen2.5-coder:1.5b
   # Resumes from where it left off
   ```

2. **Download During Off-Peak Hours**:
   - Better network speeds

3. **Use Fallback Mode**:
   - No download needed

**Status**: Network-dependent

---

### ⚠️  Proxy Networks

**Issue**: Installer may fail to reach ollama.com through proxy.

**Affected**:
- Corporate networks
- University networks
- VPN/proxy users

**Symptoms**:
- Connection refused
- HTTPS certificate errors
- Timeout errors

**Workarounds**:
1. **Configure Proxy** (before running):
   ```bash
   export http_proxy=http://proxy.company.com:8080
   export https_proxy=http://proxy.company.com:8080
   export no_proxy=localhost,127.0.0.1
   ```

2. **Use Corporate Proxy Settings**:
   ```bash
   # macOS
   networksetup -setwebproxy "Wi-Fi" proxy.company.com 8080

   # Linux
   # Edit /etc/environment
   ```

3. **Download Manually Outside Proxy**:
   - Install on non-proxy network
   - Copy to target machine

4. **Use Fallback Mode**:
   - No network required

**Status**: Network configuration issue

---

### ❌ Corporate Firewalls

**Issue**: Firewall may block ollama.com or port 11434.

**Blocked**:
- ollama.com domain (installer download)
- Port 11434 (Ollama server)

**Symptoms**:
- Cannot download installer
- Cannot reach Ollama server
- Connection refused errors

**Workarounds**:
1. **Request Firewall Exception**:
   - Allow ollama.com
   - Allow localhost:11434

2. **Use Different Port**:
   ```bash
   export OLLAMA_HOST=0.0.0.0:8080
   ollama serve
   ```

3. **Use Fallback Mode**:
   - No network or ports needed

**Status**: Enterprise policy limitation

---

## 🔧 Functional Limitations

### ⚠️  Port 11434 Already in Use

**Issue**: Another service using Ollama's default port.

**Symptoms**:
```
❌ Failed to start Ollama server
```

**Diagnosis**:
```bash
lsof -i :11434
```

**Workarounds**:
1. **Stop Conflicting Service**:
   ```bash
   kill -9 <PID>
   ```

2. **Change Ollama Port**:
   ```bash
   export OLLAMA_HOST=0.0.0.0:11435
   ollama serve

   # Update config
   # Edit .memories/.llm-config.json
   # Change endpoint to http://localhost:11435
   ```

**Status**: Resolvable conflict

---

### ⚠️  Ollama Service Not Starting on Boot

**Issue**: Ollama doesn't auto-start after installation.

**Affected**:
- Some Linux distributions
- macOS (if not using Ollama.app)

**Workaround**:
1. **Enable Service** (Linux with systemd):
   ```bash
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

2. **Add to Startup** (macOS):
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   ollama serve &
   ```

3. **Manual Start**:
   ```bash
   ollama serve
   ```

**Status**: Installation-dependent

---

### ⚠️  Model Not Persisting After Pull

**Issue**: Model disappears after system restart.

**Cause**: Model cache location not persistent.

**Diagnosis**:
```bash
ollama list
# Should show qwen2.5-coder:1.5b even after restart
```

**Workaround**:
1. **Check Model Location**:
   ```bash
   # Default location
   ls ~/.ollama/models/
   ```

2. **Re-pull if Needed**:
   ```bash
   ollama pull qwen2.5-coder:1.5b
   ```

**Status**: Should not happen in normal installations

---

## 🔒 Security Limitations

### ⚠️  Running as Root/Sudo

**Issue**: Installer may require sudo on Linux.

**Risk**: Installing system-level packages as root.

**Best Practice**:
1. **Review Install Script** before running:
   ```bash
   curl -fsSL https://ollama.com/install.sh
   # Inspect before piping to sh
   ```

2. **Use User-Level Installation** (if available):
   ```bash
   # Some systems support non-root install
   ```

**Status**: Standard for system-level package installation

---

### ⚠️  Ollama API Exposed on localhost

**Issue**: Ollama server listens on localhost:11434.

**Risk**: Local processes can access LLM API.

**Mitigation**:
- Default binding is localhost only (not 0.0.0.0)
- No external network access
- Firewall rules apply

**To Restrict Further**:
```bash
# Ollama doesn't support auth by default
# Use firewall rules if needed
```

**Status**: Expected behavior for local development

---

## 🧪 Testing Limitations

### ⚠️  Dry-Run Mode Not Perfect

**Issue**: Dry-run cannot fully simulate all scenarios.

**What Dry-Run Does**:
- ✅ Simulates commands
- ✅ Shows what would happen
- ✅ Checks OS detection
- ✅ Validates system requirements

**What Dry-Run Cannot Do**:
- ❌ Test actual network connectivity
- ❌ Verify Ollama installation succeeds
- ❌ Test model download
- ❌ Verify server starts

**Recommendation**:
- Use dry-run for preview
- Test actual installation on dev machine first

**Status**: Limitation of dry-run testing

---

## 📊 Performance Limitations

### ⚠️  First Model Load is Slow

**Issue**: Initial model load takes 1-20 seconds.

**Cause**: Model must be loaded into RAM from disk.

**Impact**:
- **SSD**: 1-2 seconds
- **HDD**: 10-20 seconds

**After First Load**:
- Model stays in memory
- Instant responses
- No reload needed

**Workaround**:
- Keep Ollama server running
- Model stays loaded in memory

**Status**: Expected behavior

---

### ⚠️  Model Inference Speed Varies

**Issue**: Response time depends on hardware.

**Benchmarks** (qwen2.5-coder:1.5b):
- **M1 Mac**: 50-100 tokens/sec ✅
- **M2/M3 Mac**: 100-150 tokens/sec ✅
- **Intel i7 (8th gen)**: 20-40 tokens/sec ⚠️
- **Intel i5 (6th gen)**: 10-20 tokens/sec ⚠️

**Workaround**:
- Use fallback mode if too slow
- Upgrade hardware
- Use smaller model (0.5b)

**Status**: Hardware-dependent

---

## 🔄 Upgrade Limitations

### ⚠️  No Automatic Updates

**Issue**: Installer doesn't auto-update Ollama or models.

**Manual Update Required**:
```bash
# Update Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Update model
ollama pull qwen2.5-coder:1.5b  # Re-pulls latest
```

**Workaround**:
- Check for updates monthly
- Re-run installer to update config

**Status**: Manual maintenance required

---

### ⚠️  Config Not Migrated on Reinstall

**Issue**: Reinstalling may overwrite config.

**Risk**: Lose custom settings.

**Workaround**:
1. **Backup Config**:
   ```bash
   cp .memories/.llm-config.json .memories/.llm-config.json.bak
   ```

2. **Re-run Installer**:
   ```bash
   ./install.sh
   ```

3. **Merge Configs** if needed

**Status**: Installer overwrites config by design

---

## 📝 Documentation Limitations

### ⚠️  Platform-Specific Instructions

**Issue**: Some instructions are macOS/Linux specific.

**Affected**:
- Windows users
- Non-systemd Linux
- Exotic distributions

**Workaround**:
- Check official Ollama docs for your platform
- Use fallback mode if unsure

**Status**: Documentation covers common platforms only

---

## 🎯 Summary

| Limitation | Severity | Workaround Available | Status |
|------------|----------|---------------------|--------|
| Windows native | ❌ High | ✅ Yes (WSL2, Node.js) | Won't fix |
| WSL performance | ⚠️  Medium | ✅ Yes (WSL2, optimize) | Architecture |
| ARM Linux | ⚠️  Medium | ✅ Yes (fallback) | Upstream |
| Low RAM (<8GB) | ⚠️  Medium | ✅ Yes (fallback, smaller model) | Hardware |
| Low disk (<12GB) | ⚠️  Medium | ✅ Yes (fallback, cleanup) | Hardware |
| HDD vs SSD | ⚠️  Low | ⚠️  Partial (just slower) | Hardware |
| Offline install | ❌ High | ✅ Yes (fallback) | Expected |
| Slow network | ⚠️  Medium | ✅ Yes (retry, fallback) | Network |
| Proxy networks | ⚠️  Medium | ✅ Yes (config, fallback) | Config |
| Firewalls | ❌ High | ✅ Yes (fallback) | Policy |
| Port conflicts | ⚠️  Low | ✅ Yes (change port) | Resolvable |
| No auto-start | ⚠️  Low | ✅ Yes (systemd, manual) | Config |
| Dry-run limits | ⚠️  Low | ⚠️  Partial (test real install) | Testing |
| First load slow | ⚠️  Low | ⚠️  Partial (SSD helps) | Expected |
| No auto-update | ⚠️  Low | ✅ Yes (manual update) | Design |

**Key Takeaway**: Almost every limitation has a workaround, and **fallback mode always works**.

---

**Version**: 1.0
**Last Updated**: October 5, 2025
**Status**: Production
