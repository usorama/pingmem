#!/usr/bin/env bash
#
# Claude Memory Intelligence - Ollama Installer
# Version: 1.0
# Purpose: Foolproof installation of Ollama with qwen2.5-coder:1.5b model
# Fallback: Gracefully degrades to regex-only mode if Ollama unavailable
#
# Usage:
#   ./install.sh              # Interactive installation
#   ./install.sh --dry-run    # Test without making changes
#   ./install.sh --help       # Show usage information
#

set -euo pipefail  # Exit on error, undefined var, pipe failure

# =============================================================================
# CONSTANTS
# =============================================================================

readonly OLLAMA_MODEL="qwen2.5-coder:1.5b"
readonly OLLAMA_INSTALL_URL="https://ollama.com/install.sh"
readonly OLLAMA_API="http://localhost:11434"
readonly MIN_RAM_GB=8
readonly MIN_DISK_GB=12
readonly SCRIPT_VERSION="1.0"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Global flags
DRY_RUN=false

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Print colored output
print_color() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

print_success() { print_color "$GREEN" "✅ $*"; }
print_error() { print_color "$RED" "❌ $*"; }
print_warning() { print_color "$YELLOW" "⚠️  $*"; }
print_info() { print_color "$BLUE" "ℹ️  $*"; }
print_step() { print_color "$CYAN" "▶ $*"; }

# Print section header
print_header() {
    echo ""
    print_color "$CYAN" "============================================"
    print_color "$CYAN" "  $1"
    print_color "$CYAN" "============================================"
    echo ""
}

# Execute command with dry-run support
execute() {
    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would execute: $*"
        return 0
    else
        "$@"
    fi
}

# =============================================================================
# ENVIRONMENT DETECTION
# =============================================================================

# Detect operating system
detect_os() {
    local os=""
    local arch=""

    # Primary: Use uname -s (most portable)
    case "$(uname -s)" in
        Linux*)     os="linux";;
        Darwin*)    os="macos";;
        CYGWIN*)    os="windows-cygwin";;
        MINGW*)     os="windows-mingw";;
        MSYS*)      os="windows-msys";;
        *)          os="unknown";;
    esac

    # Detect architecture
    arch="$(uname -m)"

    # Special case: Windows detection
    if [[ -n "${WSL_DISTRO_NAME:-}" ]] || grep -qi microsoft /proc/version 2>/dev/null; then
        os="linux-wsl"
    fi

    echo "${os}_${arch}"
}

# Check system resources
check_system_requirements() {
    local os_arch="$1"
    local ram_gb=0
    local disk_gb=0

    print_step "Checking system requirements..."

    # Get RAM (GB)
    if [[ "$os_arch" == "macos"* ]]; then
        ram_gb=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
    elif [[ "$os_arch" == "linux"* ]]; then
        ram_gb=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024 / 1024 ))
    else
        print_warning "Cannot detect RAM on this system"
        ram_gb=$MIN_RAM_GB  # Assume minimum met
    fi

    # Get free disk space (GB)
    if command -v df >/dev/null 2>&1; then
        # Try to get available space in GB
        if df -BG . >/dev/null 2>&1; then
            disk_gb=$(df -BG . | awk 'NR==2 {print $4}' | tr -d 'G')
        elif df -g . >/dev/null 2>&1; then
            disk_gb=$(df -g . | awk 'NR==2 {print $4}')
        else
            disk_gb=$MIN_DISK_GB  # Assume minimum met
        fi
    else
        print_warning "Cannot detect disk space on this system"
        disk_gb=$MIN_DISK_GB  # Assume minimum met
    fi

    # Validate
    local warnings=()

    if (( ram_gb < MIN_RAM_GB )); then
        warnings+=("RAM: ${ram_gb}GB detected, ${MIN_RAM_GB}GB recommended")
    fi

    if (( disk_gb < MIN_DISK_GB )); then
        warnings+=("Disk: ${disk_gb}GB free, ${MIN_DISK_GB}GB recommended")
    fi

    if (( ${#warnings[@]} > 0 )); then
        echo ""
        print_warning "System Warnings:"
        for warning in "${warnings[@]}"; do
            echo "  ⚠️  $warning"
        done
        echo ""
        print_info "The installer can proceed, but performance may be degraded."
        echo "You may experience:"
        echo "  - Slower model loading times"
        echo "  - Potential memory swapping"
        echo "  - Longer response times"
        echo ""

        if [[ "$DRY_RUN" == false ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Installation cancelled."
                exit 0
            fi
        fi
    else
        print_success "System requirements met (${ram_gb}GB RAM, ${disk_gb}GB free)"
    fi
}

# =============================================================================
# OLLAMA DETECTION & MANAGEMENT
# =============================================================================

# Check if Ollama is installed
is_ollama_installed() {
    if command -v ollama >/dev/null 2>&1; then
        local version=$(ollama --version 2>/dev/null | head -n1)
        print_success "Ollama already installed: ${version}"
        return 0
    else
        return 1
    fi
}

# Check if Ollama server is running
is_ollama_running() {
    if curl -f -s "${OLLAMA_API}/api/version" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Ollama server
start_ollama_server() {
    print_step "Starting Ollama server..."

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would start Ollama server"
        return 0
    fi

    # Background server start
    if command -v systemctl >/dev/null 2>&1; then
        # Linux with systemd - try system service first
        if systemctl is-active --quiet ollama 2>/dev/null; then
            print_info "Ollama service already running"
            return 0
        fi

        # Try to start system service
        if sudo systemctl start ollama 2>/dev/null; then
            print_info "Started Ollama system service"
        else
            # Fall back to manual start
            ollama serve >/dev/null 2>&1 &
        fi
    else
        # macOS or non-systemd Linux
        ollama serve >/dev/null 2>&1 &
    fi

    # Wait for server to be ready (max 30 seconds)
    local timeout=30
    local elapsed=0

    while ! is_ollama_running; do
        if (( elapsed >= timeout )); then
            print_error "Failed to start Ollama server"
            return 1
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done

    print_success "Ollama server started"
    return 0
}

# Install Ollama
install_ollama() {
    local os_arch="$1"

    print_step "Installing Ollama..."

    # Confirm installation
    echo ""
    print_info "This will download and install Ollama from https://ollama.com"
    echo ""
    echo "What is Ollama?"
    echo "  - Local LLM runtime for running AI models"
    echo "  - Required for enhanced intent analysis"
    echo "  - Download size: ~100MB"
    echo "  - Model size: ~1GB (qwen2.5-coder:1.5b)"
    echo ""
    echo "Without Ollama:"
    echo "  - Memory system will use basic regex patterns"
    echo "  - Intent detection accuracy: ~70%"
    echo ""
    echo "With Ollama:"
    echo "  - Enhanced LLM-based intent analysis"
    echo "  - Intent detection accuracy: ~94.8%"
    echo ""

    if [[ "$DRY_RUN" == false ]]; then
        read -p "Continue? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Installation cancelled."
            return 1
        fi
    fi

    # Platform-specific installation
    case "$os_arch" in
        macos_*|linux_*|linux-wsl_*)
            # Use official install script
            print_info "Downloading and running official install script..."
            if [[ "$DRY_RUN" == true ]]; then
                print_info "[DRY-RUN] Would execute: curl -fsSL ${OLLAMA_INSTALL_URL} | sh"
                return 0
            fi

            if ! curl -fsSL "${OLLAMA_INSTALL_URL}" | sh; then
                print_error "Installation failed"
                echo ""
                print_info "Please try manual installation:"
                echo "  macOS: brew install ollama"
                echo "  Linux: curl -fsSL https://ollama.com/install.sh | sh"
                return 1
            fi
            ;;
        windows-*)
            print_error "Windows native installation not supported in script"
            print_info "Please download installer from: https://ollama.com/download"
            return 1
            ;;
        *)
            print_error "Unsupported OS: $os_arch"
            return 1
            ;;
    esac

    print_success "Ollama installed successfully"
    return 0
}

# =============================================================================
# MODEL MANAGEMENT
# =============================================================================

# Check if model is already pulled
is_model_pulled() {
    local model="$1"

    if ! is_ollama_running; then
        return 1
    fi

    if ollama list 2>/dev/null | grep -q "^${model}"; then
        print_success "Model already downloaded: ${model}"
        return 0
    else
        return 1
    fi
}

# Pull model with progress tracking
pull_model() {
    local model="$1"

    print_step "Downloading model: ${model}"
    echo "This may take several minutes depending on your connection..."
    echo "Model size: ~1GB"
    echo ""

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would execute: ollama pull ${model}"
        return 0
    fi

    # Direct CLI (shows progress)
    if ollama pull "$model"; then
        print_success "Model downloaded successfully"
        return 0
    else
        print_error "Failed to download model"
        echo ""
        print_info "You can try pulling manually later:"
        echo "  ollama pull ${model}"
        return 1
    fi
}

# Test model
test_model() {
    local model="$1"

    print_step "Testing model with simple query..."

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would test model: ${model}"
        return 0
    fi

    local response=$(timeout 10s ollama run "$model" "Say hello in one word" 2>&1 | head -n1 || true)

    if [[ -n "$response" ]] && [[ ! "$response" =~ "error" ]]; then
        print_success "Model test successful: ${response}"
        return 0
    else
        print_warning "Model test inconclusive"
        print_info "This doesn't mean the model won't work, just that the quick test didn't respond as expected"
        return 1
    fi
}

# =============================================================================
# MEMORY SYSTEM CONFIGURATION
# =============================================================================

# Configure memory system for LLM mode
configure_memory_llm() {
    local model="$1"
    local config_file=".memories/.llm-config.json"

    print_step "Configuring memory system for LLM mode..."

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would create config: ${config_file}"
        return 0
    fi

    # Ensure .memories directory exists
    mkdir -p .memories

    cat > "$config_file" <<EOF
{
  "mode": "hybrid",
  "llm": {
    "provider": "ollama",
    "model": "${model}",
    "endpoint": "${OLLAMA_API}",
    "enabled": true,
    "fallback_to_regex": true
  },
  "regex": {
    "enabled": true,
    "use_as_fallback": true
  },
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

    print_success "Memory system configured for LLM mode"
    print_info "Config: $config_file"
}

# Configure memory system for regex-only mode (fallback)
configure_memory_regex_only() {
    local config_file=".memories/.llm-config.json"

    print_step "Configuring memory system for regex-only mode..."

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY-RUN] Would create fallback config: ${config_file}"
        return 0
    fi

    # Ensure .memories directory exists
    mkdir -p .memories

    cat > "$config_file" <<EOF
{
  "mode": "regex-only",
  "llm": {
    "enabled": false,
    "reason": "Ollama not available or installation declined"
  },
  "regex": {
    "enabled": true,
    "patterns": [
      "intent-detection-basic",
      "entity-extraction-simple",
      "confidence-threshold-0.7"
    ]
  },
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

    print_warning "Memory system configured for regex-only mode"
    print_info "Note: Intent analysis will use basic pattern matching"
    print_info "To enable LLM later, re-run this installer"
}

# =============================================================================
# MAIN INSTALLATION FLOW
# =============================================================================

show_help() {
    cat <<EOF
Claude Memory Intelligence - Ollama Installer v${SCRIPT_VERSION}

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --dry-run       Test installation without making changes
    --help          Show this help message
    -h              Show this help message

DESCRIPTION:
    This installer will:
      1. Check system requirements (8GB RAM, 12GB disk)
      2. Install Ollama (if not present)
      3. Download qwen2.5-coder:1.5b model (~1GB)
      4. Configure memory system for enhanced intent analysis
      5. Install and register memory system hooks in Claude Code
      6. Verify complete integration with end-to-end tests

    If Ollama cannot be installed, the system will automatically
    fall back to regex-only mode (basic pattern matching).

EXAMPLES:
    ./install.sh              # Interactive installation
    ./install.sh --dry-run    # Test without making changes

For more information, see README.md
EOF
}

main() {
    # Parse arguments
    for arg in "$@"; do
        case "$arg" in
            --dry-run)
                DRY_RUN=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $arg"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    # Show welcome message
    print_header "Claude Memory Intelligence - Ollama Setup"

    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY-RUN MODE - No changes will be made"
        echo ""
    fi

    echo "This installer will:"
    echo "  1. Check system requirements (8GB RAM, 12GB disk)"
    echo "  2. Install Ollama (if not present)"
    echo "  3. Download qwen2.5-coder:1.5b model (~1GB)"
    echo "  4. Configure memory system for enhanced intent analysis"
    echo "  5. Install and register memory system hooks"
    echo "  6. Verify complete integration"
    echo ""
    echo "If Ollama cannot be installed, the system will automatically"
    echo "fall back to regex-only mode (basic pattern matching)."
    echo ""
    echo "Estimated time: 5-10 minutes"

    if [[ "$DRY_RUN" == false ]]; then
        echo ""
        read -p "Press ENTER to continue or Ctrl+C to cancel..."
    fi

    # Phase 1: Environment Detection
    echo ""
    print_step "Phase 1/5: Detecting environment..."
    local os_arch=$(detect_os)
    print_info "Detected: $os_arch"

    check_system_requirements "$os_arch"

    # Phase 2: Ollama Installation Check
    echo ""
    print_step "Phase 2/5: Checking Ollama installation..."
    local ollama_installed=false

    if is_ollama_installed; then
        ollama_installed=true
    else
        print_warning "Ollama not found"

        if [[ "$DRY_RUN" == false ]]; then
            echo ""
            read -p "Install Ollama now? (Y/n): " -n 1 -r
            echo
        fi

        if [[ "$DRY_RUN" == true ]] || [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            if install_ollama "$os_arch"; then
                ollama_installed=true
            else
                print_warning "Proceeding with fallback mode"
            fi
        else
            print_info "Skipping Ollama installation."
        fi
    fi

    # Phase 3: Server & Model Setup
    if [[ "$ollama_installed" == true ]]; then
        echo ""
        print_step "Phase 3/5: Setting up Ollama server and model..."

        # Ensure server is running
        if ! is_ollama_running; then
            if ! start_ollama_server; then
                print_warning "Falling back to regex-only mode"
                configure_memory_regex_only
                show_completion_fallback
                exit 0
            fi
        else
            print_info "Ollama server already running"
        fi

        # Check/pull model
        if ! is_model_pulled "$OLLAMA_MODEL"; then
            if ! pull_model "$OLLAMA_MODEL"; then
                print_warning "Model download failed, falling back to regex-only mode"
                configure_memory_regex_only
                show_completion_fallback
                exit 0
            fi
        fi

        # Test model
        test_model "$OLLAMA_MODEL" || true  # Don't fail on test

        # Phase 4: Configure memory system
        echo ""
        print_step "Phase 4/5: Configuring memory system..."
        configure_memory_llm "$OLLAMA_MODEL"
    else
        echo ""
        print_step "Phase 3-4/5: Skipping Ollama setup (not installed)..."
        configure_memory_regex_only
    fi

    # Phase 5: Hook Installation & Registration
    echo ""
    print_step "Phase 5/6: Installing memory system hooks..."

    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Copy hooks to ~/.claude/hooks/
    if [[ "$DRY_RUN" == false ]]; then
        mkdir -p "$HOME/.claude/hooks"

        # Copy Python hooks
        for hook in memory-update-posttooluse.py github-issue-automation.py pending-issues-check.py; do
            if [[ -f "$SCRIPT_DIR/core/hooks/$hook" ]]; then
                cp "$SCRIPT_DIR/core/hooks/$hook" "$HOME/.claude/hooks/"
                chmod +x "$HOME/.claude/hooks/$hook"
                print_success "Installed: $hook"
            else
                print_warning "Not found: $hook (skipping)"
            fi
        done

        # Register hooks in settings.json
        print_step "Registering hooks in Claude Code..."
        if python3 "$SCRIPT_DIR/core/scripts/register-hooks.py"; then
            print_success "Hooks registered in ~/.claude/settings.json"
        else
            print_error "Failed to register hooks"
            print_info "You may need to manually add hooks to ~/.claude/settings.json"
        fi
    else
        print_info "[DRY-RUN] Would copy hooks to ~/.claude/hooks/"
        print_info "[DRY-RUN] Would register hooks in settings.json"
    fi

    # Phase 6: Final Verification
    echo ""
    print_step "Phase 6/6: Verifying installation..."

    if [[ "$DRY_RUN" == false ]]; then
        # Run integration verification
        if [[ -f "$SCRIPT_DIR/core/scripts/verify-integration.sh" ]]; then
            echo ""
            print_step "Running integration verification..."
            echo ""

            if bash "$SCRIPT_DIR/core/scripts/verify-integration.sh"; then
                echo ""
                print_success "✅ All integration tests passed!"
            else
                echo ""
                print_error "⚠️  Integration verification failed"
                print_info "Please review errors above"
                print_info "You can re-run verification with:"
                echo "  bash $SCRIPT_DIR/core/scripts/verify-integration.sh"
                exit 1
            fi
        else
            print_warning "Verification script not found (skipping)"
        fi
    else
        print_info "[DRY-RUN] Would run integration verification"
    fi

    if [[ "$ollama_installed" == true ]] && (is_model_pulled "$OLLAMA_MODEL" || [[ "$DRY_RUN" == true ]]); then
        show_completion_success
    else
        show_completion_fallback
    fi
}

# Show successful completion message
show_completion_success() {
    echo ""
    print_success "INSTALLATION COMPLETE"
    echo ""
    print_info "Memory System Configuration:"
    echo "  Mode:     Hybrid (LLM + Regex)"
    echo "  Model:    $OLLAMA_MODEL"
    echo "  Endpoint: $OLLAMA_API"
    echo "  Fallback: Regex patterns enabled"
    echo ""
    print_info "You can now use enhanced intent analysis!"
    echo ""
    print_header "Installation Complete"
}

# Show fallback mode completion message
show_completion_fallback() {
    echo ""
    print_warning "INSTALLATION COMPLETE (FALLBACK MODE)"
    echo ""
    print_info "Memory System Configuration:"
    echo "  Mode:     Regex-only"
    echo "  Reason:   Ollama installation declined/failed"
    echo "  Features: Basic pattern matching"
    echo ""
    print_info "Current Capabilities:"
    echo "  ✅ Keyword-based intent detection"
    echo "  ✅ Simple entity extraction"
    echo "  ⚠️  Lower accuracy (~70% vs 94.8%)"
    echo ""
    print_info "To Enable Full LLM Mode Later:"
    echo "  1. Install Ollama:"
    echo "     curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    echo "  2. Re-run installer:"
    echo "     ./install.sh"
    echo ""
    print_header "Installation Complete"
}

# Error handling
trap 'print_error "Installation failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
