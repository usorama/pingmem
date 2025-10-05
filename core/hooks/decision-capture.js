#!/usr/bin/env node

/**
 * Decision Capture Hook
 * Project-Agnostic Memory Intelligence System
 *
 * Automatically captures decisions when stories complete or significant tasks finish.
 * Integrates with Layer 4: Decision Intelligence system.
 *
 * Triggers:
 * - Story completion (EVIDENCE files created)
 * - Manual invocation via command
 * - Git commits with 'decision:' prefix
 *
 * Usage:
 *   node decision-capture.js --story STORY-ID
 *   node decision-capture.js --prompt
 *   node decision-capture.js --validate <file>
 *
 * Works with ANY project type: Next.js, React, Python, Go, etc.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load configuration
const configLoader = require('../lib/config-loader');
const config = configLoader.loadConfig();

// Paths (from config)
const PROJECT_ROOT = config.project.root;
const DECISIONS_DIR = configLoader.getDecisionsDir(config);
const EVIDENCE_DIR = config.workflow.evidenceDir ?
  path.resolve(PROJECT_ROOT, config.workflow.evidenceDir) :
  path.join(PROJECT_ROOT, 'docs/evidence');

// Decision categories (from config)
const CATEGORIES = config.decisionIntelligence.categories || [
  'architecture', 'database', 'api', 'ui', 'infrastructure', 'auth'
];

/**
 * Generate next decision ID for a category
 * @param {string} category - Category name
 * @returns {string} Decision ID (e.g., DEC-AUTH-20251005-001)
 */
function generateDecisionId(category) {
  const categoryUpper = category.toUpperCase();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const categoryPath = path.join(DECISIONS_DIR, category);
  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath, { recursive: true });
  }

  // Find existing decisions for today
  const files = fs.readdirSync(categoryPath)
    .filter(f => f.startsWith(`DEC-${categoryUpper}-${today}`))
    .sort();

  let seq = 1;
  if (files.length > 0) {
    const lastFile = files[files.length - 1];
    const match = lastFile.match(/-(\d{3})\.json$/);
    if (match) {
      seq = parseInt(match[1], 10) + 1;
    }
  }

  const seqStr = seq.toString().padStart(3, '0');
  return `DEC-${categoryUpper}-${today}-${seqStr}`;
}

/**
 * Validate decision record against schema
 * @param {Object} decision - Decision record
 * @returns {Object} Validation result {valid: boolean, errors: Array}
 */
function validateDecision(decision) {
  const errors = [];

  // Required fields
  const required = ['decision_id', 'title', 'context', 'decision', 'rationale', 'metadata'];
  for (const field of required) {
    if (!decision[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Field length validations
  if (decision.title && (decision.title.length < 10 || decision.title.length > 200)) {
    errors.push('Title must be between 10-200 characters');
  }

  if (decision.context && decision.context.length < 50) {
    errors.push('Context must be at least 50 characters');
  }

  if (decision.decision && decision.decision.length < 50) {
    errors.push('Decision must be at least 50 characters');
  }

  if (decision.rationale && decision.rationale.length < 100) {
    errors.push('Rationale must be at least 100 characters');
  }

  // Decision ID format
  if (decision.decision_id && !/^DEC-[A-Z]+-\d{8}-\d{3}$/.test(decision.decision_id)) {
    errors.push('Invalid decision_id format (expected: DEC-CATEGORY-YYYYMMDD-SEQ)');
  }

  // Confidence score
  if (decision.confidence_score !== undefined) {
    if (typeof decision.confidence_score !== 'number' ||
        decision.confidence_score < 0 ||
        decision.confidence_score > 1) {
      errors.push('Confidence score must be between 0.0 and 1.0');
    }
  }

  // Validation status
  const validStatuses = ['tentative', 'confirmed', 'deprecated'];
  if (decision.validation_status && !validStatuses.includes(decision.validation_status)) {
    errors.push(`Invalid validation_status (must be one of: ${validStatuses.join(', ')})`);
  }

  // Metadata
  if (decision.metadata) {
    if (!decision.metadata.created_at) {
      errors.push('Metadata must include created_at');
    }
    if (!decision.metadata.created_by) {
      errors.push('Metadata must include created_by');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prompt user for decision details (interactive mode)
 * @returns {Promise<Object>} Decision record and category
 */
async function promptForDecision() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => {
    rl.question(prompt, resolve);
  });

  console.log('\n📋 Decision Capture - Interactive Mode\n');

  // Category selection
  console.log('Available categories:');
  CATEGORIES.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

  const categoryIdx = await question(`\nSelect category (1-${CATEGORIES.length}): `);
  const category = CATEGORIES[parseInt(categoryIdx, 10) - 1];

  if (!category) {
    throw new Error('Invalid category selection');
  }

  const decisionId = generateDecisionId(category);
  console.log(`\nGenerated Decision ID: ${decisionId}\n`);

  // Gather decision details
  const title = await question('Decision title: ');
  const context = await question('Context (WHY was this needed?): ');
  const decision = await question('Decision (WHAT did we decide?): ');
  const rationale = await question('Rationale (WHY this option?): ');

  const hasAlternatives = await question('Add alternatives considered? (y/n): ');
  const alternatives = [];

  if (hasAlternatives.toLowerCase() === 'y') {
    let addMore = true;
    while (addMore) {
      const option = await question('  Alternative option: ');
      const rejectedBecause = await question('  Why rejected: ');

      alternatives.push({
        option,
        pros: [],
        cons: [],
        rejected_because: rejectedBecause
      });

      const more = await question('Add another alternative? (y/n): ');
      addMore = more.toLowerCase() === 'y';
    }
  }

  const hasMigration = await question('Is this a migration/deprecation? (y/n): ');
  let migration = null;

  if (hasMigration.toLowerCase() === 'y') {
    const oldPattern = await question('  Old pattern being replaced: ');
    const newPattern = await question('  New pattern to adopt: ');
    const status = await question('  Migration status (PENDING/IN_PROGRESS/COMPLETED): ');

    migration = {
      old_pattern: oldPattern,
      new_pattern: newPattern,
      deprecation_date: new Date().toISOString().split('T')[0],
      status: status.toUpperCase()
    };
  }

  const confidenceStr = await question('Confidence score (0.0-1.0, default 0.80): ');
  const confidenceScore = parseFloat(confidenceStr) || 0.80;

  const tagsStr = await question('Tags (comma-separated): ');
  const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

  rl.close();

  // Build decision record
  const decisionRecord = {
    decision_id: decisionId,
    title,
    context,
    decision,
    rationale,
    confidence_score: confidenceScore,
    validation_status: confidenceScore >= 0.95 ? 'confirmed' : 'tentative',
    metadata: {
      created_at: new Date().toISOString(),
      created_by: 'claude-code-ai',
      tags,
      version: 1
    }
  };

  if (alternatives.length > 0) {
    decisionRecord.alternatives = alternatives;
  }

  if (migration) {
    decisionRecord.migration = migration;
  }

  return { decision: decisionRecord, category };
}

/**
 * Extract decisions from story evidence
 * @param {string} storyId - Story ID (e.g., WEB-UI-003 or PC-014-WEB-UI-003)
 * @returns {Array} Potential decisions extracted from evidence
 */
function extractDecisionsFromStory(storyId) {
  // Look for evidence file
  if (!fs.existsSync(EVIDENCE_DIR)) {
    return [];
  }

  const evidencePattern = new RegExp(`${storyId}.*EVIDENCE\\.md$`, 'i');
  const evidenceFiles = fs.readdirSync(EVIDENCE_DIR)
    .filter(f => evidencePattern.test(f));

  if (evidenceFiles.length === 0) {
    return [];
  }

  const evidencePath = path.join(EVIDENCE_DIR, evidenceFiles[0]);
  const content = fs.readFileSync(evidencePath, 'utf-8');

  const decisions = [];

  // Look for decision markers in evidence
  const decisionMarkers = [
    /## Decision: (.*)/gi,
    /### Decision Made: (.*)/gi,
    /\*\*Decision\*\*: (.*)/gi
  ];

  for (const marker of decisionMarkers) {
    let match;
    while ((match = marker.exec(content)) !== null) {
      decisions.push({
        title: match[1].trim(),
        story_id: storyId,
        evidence_file: evidenceFiles[0]
      });
    }
  }

  return decisions;
}

/**
 * Save decision record to filesystem
 * @param {Object} decision - Decision record
 * @param {string} category - Category name
 * @returns {string} Path to saved decision file
 */
function saveDecision(decision, category) {
  const categoryPath = path.join(DECISIONS_DIR, category);

  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath, { recursive: true });
  }

  const filePath = path.join(categoryPath, `${decision.decision_id}.json`);

  // Pretty-print JSON
  const content = JSON.stringify(decision, null, 2);

  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`\n✅ Decision saved: ${filePath}\n`);

  return filePath;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--help') || args.length === 0) {
      console.log(`
📋 Decision Capture Hook - Project-Agnostic

Usage:
  --prompt                Interactive mode (prompt for decision details)
  --story <story-id>      Extract decisions from story evidence
  --validate <file>       Validate existing decision record
  --help                  Show this help

Examples:
  node decision-capture.js --prompt
  node decision-capture.js --story WEB-UI-003
  node decision-capture.js --validate ${DECISIONS_DIR}/auth/DEC-AUTH-20251005-001.json

Configuration:
  Edit .memory-config.json in your project root to customize:
  - Decision categories
  - Evidence directory path
  - Validation thresholds
`);
      return;
    }

    if (args.includes('--prompt')) {
      const { decision, category } = await promptForDecision();

      // Validate
      const validation = validateDecision(decision);
      if (!validation.valid) {
        console.error('\n❌ Validation errors:');
        validation.errors.forEach(err => console.error(`  - ${err}`));
        console.error('\nDecision not saved.\n');
        process.exit(1);
      }

      // Save
      const filePath = saveDecision(decision, category);

      console.log('Decision details:');
      console.log(`  ID: ${decision.decision_id}`);
      console.log(`  Title: ${decision.title}`);
      console.log(`  Confidence: ${decision.confidence_score}`);
      console.log(`  Status: ${decision.validation_status}`);
    }
    else if (args.includes('--story')) {
      const storyId = args[args.indexOf('--story') + 1];

      console.log(`\n🔍 Searching for decisions in story: ${storyId}\n`);

      const decisions = extractDecisionsFromStory(storyId);

      if (decisions.length === 0) {
        console.log(`No decisions found in evidence for ${storyId}\n`);
        console.log('Tip: Use --prompt to manually capture decisions\n');
      } else {
        console.log(`Found ${decisions.length} potential decision(s):\n`);
        decisions.forEach((d, i) => {
          console.log(`${i + 1}. ${d.title}`);
          console.log(`   Story: ${d.story_id}`);
          console.log(`   Evidence: ${d.evidence_file}\n`);
        });

        console.log('To capture these decisions, use --prompt and reference the story ID\n');
      }
    }
    else if (args.includes('--validate')) {
      const filePath = args[args.indexOf('--validate') + 1];

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const decision = JSON.parse(content);

      const validation = validateDecision(decision);

      if (validation.valid) {
        console.log(`\n✅ Decision record is valid: ${filePath}\n`);
      } else {
        console.error(`\n❌ Validation errors in ${filePath}:`);
        validation.errors.forEach(err => console.error(`  - ${err}`));
        console.error('');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Export functions for use as module
module.exports = {
  generateDecisionId,
  validateDecision,
  promptForDecision,
  extractDecisionsFromStory,
  saveDecision
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
