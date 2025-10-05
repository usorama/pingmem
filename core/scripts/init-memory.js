#!/usr/bin/env node

/**
 * Memory System Initialization Script
 *
 * Initializes the memory system in a project by:
 * - Creating required directory structure
 * - Generating initial configuration files
 * - Creating template decision records
 * - Setting up codebase tracking
 *
 * Usage: node init-memory.js [--force]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const FORCE = process.argv.includes('--force');

/**
 * Create directory structure
 */
function createDirectoryStructure() {
  const dirs = [
    '.memories',
    '.memories/decisions',
    '.memories/decisions/auth',
    '.memories/decisions/database',
    '.memories/decisions/api',
    '.memories/decisions/ui',
    '.memories/decisions/testing',
    '.memories/decisions/infra',
    '.memories/decisions/arch',
    '.memories/validated',
    '.claude',
    '.claude/config',
    '.claude/scripts',
    '.claude/lib',
    '.claude/hooks'
  ];

  console.log('📁 Creating directory structure...\n');

  for (const dir of dirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ Created: ${dir}`);
    } else {
      console.log(`   ⏭️  Exists: ${dir}`);
    }
  }
}

/**
 * Create initial configuration files
 */
function createConfigFiles() {
  console.log('\n⚙️  Creating configuration files...\n');

  // LLM Enhancement Config
  const llmConfigPath = path.join(PROJECT_ROOT, '.claude/config/llm-enhancement.json');
  if (!fs.existsSync(llmConfigPath) || FORCE) {
    const llmConfig = {
      enabled: true,
      ollama: {
        host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2:1b',
        timeout_ms: 2000,
        health_check_ttl_ms: 300000
      },
      fallback: {
        mode: 'regex_only',
        log_failures: true
      },
      performance: {
        cache_health_checks: true,
        reuse_client: true,
        max_retries: 1
      }
    };

    fs.writeFileSync(llmConfigPath, JSON.stringify(llmConfig, null, 2));
    console.log('   ✅ Created: .claude/config/llm-enhancement.json');
  } else {
    console.log('   ⏭️  Exists: .claude/config/llm-enhancement.json');
  }

  // Codebase Scan Config
  const scanConfigPath = path.join(PROJECT_ROOT, '.claude/config/codebase-scan.json');
  if (!fs.existsSync(scanConfigPath) || FORCE) {
    const scanConfig = {
      project_name: path.basename(PROJECT_ROOT),
      project_description: 'Add your project description here',
      protected_boundaries: [],
      analyze_dirs: [],
      ignore_dirs: [
        'node_modules',
        '.next',
        'dist',
        'build',
        '.git',
        '.venv',
        '__pycache__',
        'out',
        'coverage'
      ],
      tech_stack_detection: {
        enabled: true,
        package_files: ['package.json', 'requirements.txt', 'Gemfile']
      },
      scan_depth: 2
    };

    fs.writeFileSync(scanConfigPath, JSON.stringify(scanConfig, null, 2));
    console.log('   ✅ Created: .claude/config/codebase-scan.json');
  } else {
    console.log('   ⏭️  Exists: .claude/config/codebase-scan.json');
  }
}

/**
 * Create template decision record
 */
function createTemplateDocs() {
  console.log('\n📝 Creating template documents...\n');

  // Decision Record Template
  const templatePath = path.join(PROJECT_ROOT, '.memories/decisions/TEMPLATE.json');
  if (!fs.existsSync(templatePath) || FORCE) {
    const template = {
      decision_id: 'DEC-DOMAIN-YYYYMMDD-NNN',
      title: 'Decision title (what was decided)',
      context: 'Background and circumstances that led to this decision',
      decision: 'The actual decision made and what will be implemented',
      rationale: 'Why this decision was made over alternatives',
      alternatives: [
        {
          option: 'Alternative approach that was considered',
          rejected_because: 'Reason this alternative was not chosen'
        }
      ],
      implementation: {
        how_to: 'Step-by-step implementation guide',
        anti_patterns: [
          {
            pattern: 'Pattern to avoid (e.g., OLD_API_KEY)',
            why_wrong: 'Why this pattern is wrong or deprecated',
            correct_alternative: 'The correct pattern to use instead'
          }
        ]
      },
      migration: {
        old_pattern: 'Pattern being deprecated',
        new_pattern: 'New pattern to use',
        deprecation_date: '2025-01-01',
        migration_deadline: '2025-06-01',
        status: 'PENDING',
        implementation_guide: 'How to migrate from old to new pattern'
      },
      confidence_score: 0.95,
      validation_status: 'VALIDATED',
      metadata: {
        created_at: '2025-01-01T00:00:00Z',
        created_by: 'system',
        tags: ['example', 'template'],
        related_decisions: [],
        documentation_links: [
          {
            title: 'Official Documentation',
            url: 'https://example.com/docs',
            canonicality_score: 1.0
          }
        ]
      }
    };

    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    console.log('   ✅ Created: .memories/decisions/TEMPLATE.json');
  } else {
    console.log('   ⏭️  Exists: .memories/decisions/TEMPLATE.json');
  }

  // README
  const readmePath = path.join(PROJECT_ROOT, '.memories/README.md');
  if (!fs.existsSync(readmePath) || FORCE) {
    const readme = `# Memory System

This directory contains the Claude Memory Intelligence system for maintaining
perfect context across sessions.

## Structure

\`\`\`
.memories/
├── README.md                    # This file
├── codebase-map.json           # Auto-generated codebase structure
├── last-updated.json           # Last update timestamp
├── decisions/                  # Decision Intelligence Layer
│   ├── TEMPLATE.json          # Template for new decisions
│   ├── auth/                  # Authentication decisions
│   ├── database/              # Database decisions
│   ├── api/                   # API decisions
│   ├── ui/                    # UI/UX decisions
│   ├── testing/               # Testing decisions
│   ├── infra/                 # Infrastructure decisions
│   └── arch/                  # Architecture decisions
└── validated/                  # Validated boundaries and constraints
\`\`\`

## Usage

### Query Decisions

\`\`\`bash
# Check if pattern is deprecated
node .claude/scripts/decision-query.js --check-deprecated "OLD_PATTERN"

# Find decisions by domain
node .claude/scripts/decision-query.js --domain auth

# Search for keyword
node .claude/scripts/decision-query.js --search "authentication"
\`\`\`

### Update Codebase Map

\`\`\`bash
# Regenerate codebase map
node .claude/scripts/generate-codebase-map.js
\`\`\`

## Adding New Decisions

1. Copy \`.memories/decisions/TEMPLATE.json\`
2. Name it: \`DEC-{DOMAIN}-{YYYYMMDD}-{NNN}.json\`
3. Fill in all fields
4. Place in appropriate domain folder
5. Set confidence_score (0.0-1.0)
6. Commit to git

## Maintenance

The memory system is auto-maintained through hooks:
- **PostToolUse**: Updates after every file write/edit
- **UserPromptSubmit**: Checks freshness before tasks
- **Git post-commit**: Auto-commits memory changes

No manual maintenance required.
`;

    fs.writeFileSync(readmePath, readme);
    console.log('   ✅ Created: .memories/README.md');
  } else {
    console.log('   ⏭️  Exists: .memories/README.md');
  }
}

/**
 * Create initial codebase map
 */
function createInitialCodebaseMap() {
  console.log('\n🗺️  Generating initial codebase map...\n');

  const codebaseMapPath = path.join(PROJECT_ROOT, '.memories/codebase-map.json');
  const generateScript = path.join(__dirname, 'generate-codebase-map.js');

  if (fs.existsSync(generateScript)) {
    try {
      const { generateCodebaseMap, writeCodebaseMap, loadConfig } = require(generateScript);
      const config = loadConfig(path.join(PROJECT_ROOT, '.claude/config/codebase-scan.json'));
      const map = generateCodebaseMap(config);
      writeCodebaseMap(map, codebaseMapPath);
      console.log('   ✅ Generated initial codebase map');
    } catch (error) {
      console.log('   ⚠️  Could not generate codebase map:', error.message);
    }
  } else {
    console.log('   ⚠️  Codebase map generator not found (run from package root)');
  }
}

/**
 * Create .gitignore entries
 */
function updateGitignore() {
  console.log('\n📄 Updating .gitignore...\n');

  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  const entries = [
    '',
    '# Claude Memory Intelligence',
    '.claude/hooks/*.log',
    '.memories/last-updated.json'
  ];

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('Claude Memory Intelligence')) {
      fs.appendFileSync(gitignorePath, entries.join('\n'));
      console.log('   ✅ Added memory system entries to .gitignore');
    } else {
      console.log('   ⏭️  .gitignore already contains memory entries');
    }
  } else {
    fs.writeFileSync(gitignorePath, entries.join('\n'));
    console.log('   ✅ Created .gitignore with memory entries');
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Initializing Claude Memory Intelligence System\n');
  console.log(`   Project: ${path.basename(PROJECT_ROOT)}`);
  console.log(`   Path: ${PROJECT_ROOT}\n`);

  if (FORCE) {
    console.log('⚠️  FORCE mode enabled - will overwrite existing files\n');
  }

  try {
    createDirectoryStructure();
    createConfigFiles();
    createTemplateDocs();
    createInitialCodebaseMap();
    updateGitignore();

    console.log('\n✅ Memory system initialization complete!\n');
    console.log('📚 Next steps:');
    console.log('   1. Review .claude/config/codebase-scan.json');
    console.log('   2. Add protected boundaries if needed');
    console.log('   3. Create your first decision record');
    console.log('   4. Run: node .claude/scripts/health-check.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  createDirectoryStructure,
  createConfigFiles,
  createTemplateDocs,
  createInitialCodebaseMap,
  updateGitignore
};
