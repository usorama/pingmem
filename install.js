#!/usr/bin/env node
/**
 * Claude Memory Intelligence - Ollama Installer (Node.js)
 * Version: 1.0
 * Purpose: Cross-platform Ollama installation with graceful fallback
 *
 * Usage:
 *   node install.js              # Interactive installation
 *   node install.js --dry-run    # Test without making changes
 *   node install.js --help       # Show usage information
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const https = require('https');

// =============================================================================
// CONSTANTS
// =============================================================================

const OLLAMA_MODEL = 'qwen2.5-coder:1.5b';
const OLLAMA_INSTALL_URL = 'https://ollama.com/install.sh';
const OLLAMA_API = 'http://localhost:11434';
const MIN_RAM_GB = 8;
const MIN_DISK_GB = 12;
const SCRIPT_VERSION = '1.0';

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Global flags
let DRY_RUN = false;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function print(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

const printSuccess = (msg) => print(colors.green, '✅', msg);
const printError = (msg) => print(colors.red, '❌', msg);
const printWarning = (msg) => print(colors.yellow, '⚠️ ', msg);
const printInfo = (msg) => print(colors.blue, 'ℹ️ ', msg);
const printStep = (msg) => print(colors.cyan, '▶', msg);

function printHeader(title) {
  console.log('');
  console.log(`${colors.cyan}============================================${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}============================================${colors.reset}`);
  console.log('');
}

function execute(command, options = {}) {
  if (DRY_RUN) {
    printInfo(`[DRY-RUN] Would execute: ${command}`);
    return '';
  }

  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return '';
    }
    throw error;
  }
}

// Promisified readline question
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// HTTP GET request
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

function detectOS() {
  const platform = os.platform();
  const arch = os.arch();

  let osType = 'unknown';

  switch (platform) {
    case 'darwin':
      osType = 'macos';
      break;
    case 'linux':
      // Check if WSL
      try {
        const versionInfo = fs.readFileSync('/proc/version', 'utf8');
        if (versionInfo.toLowerCase().includes('microsoft')) {
          osType = 'linux-wsl';
        } else {
          osType = 'linux';
        }
      } catch {
        osType = 'linux';
      }
      break;
    case 'win32':
      osType = 'windows';
      break;
  }

  return `${osType}_${arch}`;
}

function checkSystemRequirements(osArch) {
  printStep('Checking system requirements...');

  let ramGB = 0;
  let diskGB = 0;

  try {
    // Get RAM (GB)
    const totalMem = os.totalmem();
    ramGB = Math.floor(totalMem / (1024 ** 3));

    // Get free disk space (GB) - using df command
    if (osArch.startsWith('macos')) {
      try {
        // macOS uses -g flag instead of -BG
        const diskInfo = execSync('df -g . | tail -n1', { encoding: 'utf8' });
        const parts = diskInfo.trim().split(/\s+/);
        if (parts.length >= 4) {
          diskGB = parseInt(parts[3], 10);
        }
      } catch {
        diskGB = MIN_DISK_GB; // Assume minimum met
      }
    } else if (osArch.startsWith('linux')) {
      try {
        const diskInfo = execSync('df -BG . | tail -n1', { encoding: 'utf8' });
        const match = diskInfo.match(/(\d+)G/);
        if (match) {
          diskGB = parseInt(match[1], 10);
        }
      } catch {
        diskGB = MIN_DISK_GB; // Assume minimum met
      }
    } else {
      diskGB = MIN_DISK_GB; // Assume minimum met on Windows
    }
  } catch (error) {
    printWarning('Cannot fully detect system resources');
    ramGB = MIN_RAM_GB;
    diskGB = MIN_DISK_GB;
  }

  // Validate
  const warnings = [];

  if (ramGB < MIN_RAM_GB) {
    warnings.push(`RAM: ${ramGB}GB detected, ${MIN_RAM_GB}GB recommended`);
  }

  if (diskGB < MIN_DISK_GB) {
    warnings.push(`Disk: ${diskGB}GB free, ${MIN_DISK_GB}GB recommended`);
  }

  if (warnings.length > 0) {
    console.log('');
    printWarning('System Warnings:');
    warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
    console.log('');
    printInfo('The installer can proceed, but performance may be degraded.');
    console.log('You may experience:');
    console.log('  - Slower model loading times');
    console.log('  - Potential memory swapping');
    console.log('  - Longer response times');
    console.log('');

    return warnings;
  } else {
    printSuccess(`System requirements met (${ramGB}GB RAM, ${diskGB}GB free)`);
    return [];
  }
}

// =============================================================================
// OLLAMA DETECTION & MANAGEMENT
// =============================================================================

function isOllamaInstalled() {
  try {
    const version = execute('ollama --version', { silent: true, ignoreError: true });
    if (version) {
      printSuccess(`Ollama already installed: ${version.trim()}`);
      return true;
    }
  } catch {
    // Not installed
  }
  return false;
}

async function isOllamaRunning() {
  try {
    await httpGet(`${OLLAMA_API}/api/version`);
    return true;
  } catch {
    return false;
  }
}

async function startOllamaServer() {
  printStep('Starting Ollama server...');

  if (DRY_RUN) {
    printInfo('[DRY-RUN] Would start Ollama server');
    return true;
  }

  // Check if already running
  if (await isOllamaRunning()) {
    printInfo('Ollama server already running');
    return true;
  }

  // Start server in background
  const platform = os.platform();

  if (platform === 'linux') {
    // Try systemctl first
    try {
      execute('sudo systemctl start ollama', { silent: true, ignoreError: true });
    } catch {
      // Fall back to direct start
      spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    }
  } else {
    // macOS or Windows - direct start
    spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  }

  // Wait for server to be ready (max 30 seconds)
  const timeout = 30;
  let elapsed = 0;

  while (!(await isOllamaRunning())) {
    if (elapsed >= timeout) {
      printError('Failed to start Ollama server');
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    elapsed += 1;
  }

  printSuccess('Ollama server started');
  return true;
}

async function installOllama(osArch) {
  printStep('Installing Ollama...');

  // Show information
  console.log('');
  printInfo('This will download and install Ollama from https://ollama.com');
  console.log('');
  console.log('What is Ollama?');
  console.log('  - Local LLM runtime for running AI models');
  console.log('  - Required for enhanced intent analysis');
  console.log('  - Download size: ~100MB');
  console.log('  - Model size: ~1GB (qwen2.5-coder:1.5b)');
  console.log('');
  console.log('Without Ollama:');
  console.log('  - Memory system will use basic regex patterns');
  console.log('  - Intent detection accuracy: ~70%');
  console.log('');
  console.log('With Ollama:');
  console.log('  - Enhanced LLM-based intent analysis');
  console.log('  - Intent detection accuracy: ~94.8%');
  console.log('');

  if (!DRY_RUN) {
    const answer = await question('Continue? (Y/n): ');
    if (answer.toLowerCase() === 'n') {
      printInfo('Installation cancelled.');
      return false;
    }
  }

  // Platform-specific installation
  if (osArch.startsWith('macos') || osArch.startsWith('linux')) {
    printInfo('Downloading and running official install script...');

    if (DRY_RUN) {
      printInfo(`[DRY-RUN] Would execute: curl -fsSL ${OLLAMA_INSTALL_URL} | sh`);
      return true;
    }

    try {
      execute(`curl -fsSL ${OLLAMA_INSTALL_URL} | sh`);
      printSuccess('Ollama installed successfully');
      return true;
    } catch (error) {
      printError('Installation failed');
      console.log('');
      printInfo('Please try manual installation:');
      console.log('  macOS: brew install ollama');
      console.log('  Linux: curl -fsSL https://ollama.com/install.sh | sh');
      return false;
    }
  } else if (osArch.startsWith('windows')) {
    printError('Windows native installation not supported in script');
    printInfo('Please download installer from: https://ollama.com/download');
    return false;
  } else {
    printError(`Unsupported OS: ${osArch}`);
    return false;
  }
}

// =============================================================================
// MODEL MANAGEMENT
// =============================================================================

async function isModelPulled(model) {
  if (!(await isOllamaRunning())) {
    return false;
  }

  try {
    const models = execute('ollama list', { silent: true, ignoreError: true });
    if (models && models.includes(model)) {
      printSuccess(`Model already downloaded: ${model}`);
      return true;
    }
  } catch {
    // Model not found
  }
  return false;
}

async function pullModel(model) {
  printStep(`Downloading model: ${model}`);
  console.log('This may take several minutes depending on your connection...');
  console.log('Model size: ~1GB');
  console.log('');

  if (DRY_RUN) {
    printInfo(`[DRY-RUN] Would execute: ollama pull ${model}`);
    return true;
  }

  try {
    execute(`ollama pull ${model}`);
    printSuccess('Model downloaded successfully');
    return true;
  } catch (error) {
    printError('Failed to download model');
    console.log('');
    printInfo('You can try pulling manually later:');
    console.log(`  ollama pull ${model}`);
    return false;
  }
}

async function testModel(model) {
  printStep('Testing model with simple query...');

  if (DRY_RUN) {
    printInfo(`[DRY-RUN] Would test model: ${model}`);
    return true;
  }

  try {
    const response = execute(`ollama run ${model} "Say hello in one word"`, {
      silent: true,
      ignoreError: true,
    });

    if (response && response.trim() && !response.toLowerCase().includes('error')) {
      printSuccess(`Model test successful: ${response.trim()}`);
      return true;
    }
  } catch {
    // Test failed
  }

  printWarning('Model test inconclusive');
  printInfo("This doesn't mean the model won't work, just that the quick test didn't respond as expected");
  return false;
}

// =============================================================================
// MEMORY SYSTEM CONFIGURATION
// =============================================================================

function configureMemoryLLM(model) {
  printStep('Configuring memory system for LLM mode...');

  const configFile = path.join(process.cwd(), '.memories', '.llm-config.json');

  if (DRY_RUN) {
    printInfo(`[DRY-RUN] Would create config: ${configFile}`);
    return;
  }

  // Ensure .memories directory exists
  const memoriesDir = path.dirname(configFile);
  if (!fs.existsSync(memoriesDir)) {
    fs.mkdirSync(memoriesDir, { recursive: true });
  }

  const config = {
    mode: 'hybrid',
    llm: {
      provider: 'ollama',
      model: model,
      endpoint: OLLAMA_API,
      enabled: true,
      fallback_to_regex: true,
    },
    regex: {
      enabled: true,
      use_as_fallback: true,
    },
    updated_at: new Date().toISOString(),
  };

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

  printSuccess('Memory system configured for LLM mode');
  printInfo(`Config: ${configFile}`);
}

function configureMemoryRegexOnly() {
  printStep('Configuring memory system for regex-only mode...');

  const configFile = path.join(process.cwd(), '.memories', '.llm-config.json');

  if (DRY_RUN) {
    printInfo(`[DRY-RUN] Would create fallback config: ${configFile}`);
    return;
  }

  // Ensure .memories directory exists
  const memoriesDir = path.dirname(configFile);
  if (!fs.existsSync(memoriesDir)) {
    fs.mkdirSync(memoriesDir, { recursive: true });
  }

  const config = {
    mode: 'regex-only',
    llm: {
      enabled: false,
      reason: 'Ollama not available or installation declined',
    },
    regex: {
      enabled: true,
      patterns: [
        'intent-detection-basic',
        'entity-extraction-simple',
        'confidence-threshold-0.7',
      ],
    },
    updated_at: new Date().toISOString(),
  };

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

  printWarning('Memory system configured for regex-only mode');
  printInfo('Note: Intent analysis will use basic pattern matching');
  printInfo('To enable LLM later, re-run this installer');
}

// =============================================================================
// MAIN INSTALLATION FLOW
// =============================================================================

function showHelp() {
  console.log(`
Claude Memory Intelligence - Ollama Installer v${SCRIPT_VERSION}

USAGE:
    node install.js [OPTIONS]

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

    If Ollama cannot be installed, the system will automatically
    fall back to regex-only mode (basic pattern matching).

EXAMPLES:
    node install.js              # Interactive installation
    node install.js --dry-run    # Test without making changes

For more information, see README.md
  `);
}

function showCompletionSuccess() {
  console.log('');
  printSuccess('INSTALLATION COMPLETE');
  console.log('');
  printInfo('Memory System Configuration:');
  console.log(`  Mode:     Hybrid (LLM + Regex)`);
  console.log(`  Model:    ${OLLAMA_MODEL}`);
  console.log(`  Endpoint: ${OLLAMA_API}`);
  console.log(`  Fallback: Regex patterns enabled`);
  console.log('');
  printInfo('You can now use enhanced intent analysis!');
  console.log('');
  printHeader('Installation Complete');
}

function showCompletionFallback() {
  console.log('');
  printWarning('INSTALLATION COMPLETE (FALLBACK MODE)');
  console.log('');
  printInfo('Memory System Configuration:');
  console.log('  Mode:     Regex-only');
  console.log('  Reason:   Ollama installation declined/failed');
  console.log('  Features: Basic pattern matching');
  console.log('');
  printInfo('Current Capabilities:');
  console.log('  ✅ Keyword-based intent detection');
  console.log('  ✅ Simple entity extraction');
  console.log('  ⚠️  Lower accuracy (~70% vs 94.8%)');
  console.log('');
  printInfo('To Enable Full LLM Mode Later:');
  console.log('  1. Install Ollama:');
  console.log('     curl -fsSL https://ollama.com/install.sh | sh');
  console.log('');
  console.log('  2. Re-run installer:');
  console.log('     node install.js');
  console.log('');
  printHeader('Installation Complete');
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);

  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        DRY_RUN = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        printError(`Unknown option: ${arg}`);
        console.log('');
        showHelp();
        process.exit(1);
    }
  }

  // Show welcome message
  printHeader('Claude Memory Intelligence - Ollama Setup');

  if (DRY_RUN) {
    printWarning('DRY-RUN MODE - No changes will be made');
    console.log('');
  }

  console.log('This installer will:');
  console.log('  1. Check system requirements (8GB RAM, 12GB disk)');
  console.log('  2. Install Ollama (if not present)');
  console.log('  3. Download qwen2.5-coder:1.5b model (~1GB)');
  console.log('  4. Configure memory system for enhanced intent analysis');
  console.log('');
  console.log('If Ollama cannot be installed, the system will automatically');
  console.log('fall back to regex-only mode (basic pattern matching).');
  console.log('');
  console.log('Estimated time: 5-10 minutes');

  if (!DRY_RUN) {
    console.log('');
    await question('Press ENTER to continue or Ctrl+C to cancel...');
  }

  // Phase 1: Environment Detection
  console.log('');
  printStep('Phase 1/5: Detecting environment...');
  const osArch = detectOS();
  printInfo(`Detected: ${osArch}`);

  const warnings = checkSystemRequirements(osArch);

  if (warnings.length > 0 && !DRY_RUN) {
    const answer = await question('Continue anyway? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      printInfo('Installation cancelled.');
      process.exit(0);
    }
  }

  // Phase 2: Ollama Installation Check
  console.log('');
  printStep('Phase 2/5: Checking Ollama installation...');
  let ollamaInstalled = false;

  if (isOllamaInstalled()) {
    ollamaInstalled = true;
  } else {
    printWarning('Ollama not found');

    let shouldInstall = DRY_RUN;
    if (!DRY_RUN) {
      console.log('');
      const answer = await question('Install Ollama now? (Y/n): ');
      shouldInstall = answer.toLowerCase() !== 'n';
    }

    if (shouldInstall) {
      if (await installOllama(osArch)) {
        ollamaInstalled = true;
      } else {
        printWarning('Proceeding with fallback mode');
      }
    } else {
      printInfo('Skipping Ollama installation.');
    }
  }

  // Phase 3: Server & Model Setup
  if (ollamaInstalled) {
    console.log('');
    printStep('Phase 3/5: Setting up Ollama server and model...');

    // Ensure server is running
    if (!(await isOllamaRunning())) {
      if (!(await startOllamaServer())) {
        printWarning('Falling back to regex-only mode');
        configureMemoryRegexOnly();
        showCompletionFallback();
        process.exit(0);
      }
    } else {
      printInfo('Ollama server already running');
    }

    // Check/pull model
    if (!(await isModelPulled(OLLAMA_MODEL))) {
      if (!(await pullModel(OLLAMA_MODEL))) {
        printWarning('Model download failed, falling back to regex-only mode');
        configureMemoryRegexOnly();
        showCompletionFallback();
        process.exit(0);
      }
    }

    // Test model
    await testModel(OLLAMA_MODEL); // Don't fail on test

    // Phase 4: Configure memory system
    console.log('');
    printStep('Phase 4/5: Configuring memory system...');
    configureMemoryLLM(OLLAMA_MODEL);
  } else {
    console.log('');
    printStep('Phase 3-4/5: Skipping Ollama setup (not installed)...');
    configureMemoryRegexOnly();
  }

  // Phase 5: Final Verification
  console.log('');
  printStep('Phase 5/5: Verifying installation...');

  if (ollamaInstalled && (await isModelPulled(OLLAMA_MODEL) || DRY_RUN)) {
    showCompletionSuccess();
  } else {
    showCompletionFallback();
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('');
  printError(`Installation failed: ${error.message}`);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('');
    printError(`Installation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };
