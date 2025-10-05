#!/usr/bin/env node

/**
 * Decision Intelligence Query Module
 *
 * Provides fast query interface for decision records with:
 * - Decision lookup by ID, domain, tags
 * - Deprecation checking
 * - Canonical documentation discovery
 * - Confidence filtering
 * - Pattern search (anti-patterns, migrations)
 *
 * Usage:
 *   node decision-query.js --id DEC-AUTH-20250103-001
 *   node decision-query.js --domain auth
 *   node decision-query.js --tag migration
 *   node decision-query.js --check-deprecated "OLD_API_PATTERN"
 *   node decision-query.js --find-canonical "authentication"
 *   node decision-query.js --min-confidence 0.95
 */

const fs = require('fs');
const path = require('path');

// Configuration - dynamically resolved based on project structure
const PROJECT_ROOT = findProjectRoot();
const DECISIONS_DIR = path.join(PROJECT_ROOT, '.memories/decisions');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

/**
 * Find project root by looking for .memories directory
 * @returns {string} Project root path
 */
function findProjectRoot() {
  let currentDir = process.cwd();

  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, '.memories'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Load all decision records from filesystem
 * @returns {Array} Array of decision record objects
 */
function loadAllDecisions() {
  const cacheKey = 'all_decisions';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!fs.existsSync(DECISIONS_DIR)) {
    console.error(`❌ Decisions directory not found: ${DECISIONS_DIR}`);
    console.error('   Make sure you have initialized the memory system in your project.');
    return [];
  }

  const decisions = [];
  const domains = fs.readdirSync(DECISIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const domain of domains) {
    const domainPath = path.join(DECISIONS_DIR, domain);
    const files = fs.readdirSync(domainPath)
      .filter(file => file.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(domainPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const decision = JSON.parse(content);
        decision._file_path = filePath;
        decision._domain = domain;
        decisions.push(decision);
      } catch (error) {
        console.error(`❌ Error loading ${domain}/${file}:`, error.message);
      }
    }
  }

  cache.set(cacheKey, { data: decisions, timestamp: Date.now() });
  return decisions;
}

/**
 * Query decision by ID
 * @param {string} decisionId - Decision ID (e.g., DEC-AUTH-20250103-001)
 * @returns {Object|null} Decision record or null
 */
function queryById(decisionId) {
  const decisions = loadAllDecisions();
  return decisions.find(d => d.decision_id === decisionId) || null;
}

/**
 * Query decisions by domain
 * @param {string} domain - Domain name (e.g., 'auth', 'database')
 * @returns {Array} Array of decision records
 */
function queryByDomain(domain) {
  const decisions = loadAllDecisions();
  return decisions.filter(d => d._domain === domain);
}

/**
 * Query decisions by tag
 * @param {string} tag - Tag to search for
 * @returns {Array} Array of decision records
 */
function queryByTag(tag) {
  const decisions = loadAllDecisions();
  return decisions.filter(d =>
    d.metadata?.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Query decisions by minimum confidence score
 * @param {number} minConfidence - Minimum confidence (0.0-1.0)
 * @returns {Array} Array of decision records
 */
function queryByConfidence(minConfidence) {
  const decisions = loadAllDecisions();
  return decisions.filter(d =>
    d.confidence_score >= minConfidence
  ).sort((a, b) => b.confidence_score - a.confidence_score);
}

/**
 * Check if a pattern is deprecated
 * @param {string} pattern - Pattern to check (e.g., "OLD_API_KEY")
 * @returns {Object|null} Deprecation info or null
 */
function checkDeprecated(pattern) {
  const decisions = loadAllDecisions();

  for (const decision of decisions) {
    if (!decision.migration) continue;

    const oldPattern = decision.migration.old_pattern?.toLowerCase() || '';
    const antiPatterns = decision.implementation?.anti_patterns || [];

    // Check migration old_pattern
    if (oldPattern.includes(pattern.toLowerCase())) {
      return {
        deprecated: true,
        pattern: pattern,
        reason: `Deprecated via migration in ${decision.decision_id}`,
        new_pattern: decision.migration.new_pattern,
        deprecation_date: decision.migration.deprecation_date,
        deadline: decision.migration.migration_deadline,
        decision_id: decision.decision_id,
        migration_guide: decision.migration.implementation_guide
      };
    }

    // Check anti-patterns
    for (const antiPattern of antiPatterns) {
      if (antiPattern.pattern?.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          deprecated: true,
          pattern: pattern,
          reason: antiPattern.why_wrong,
          new_pattern: antiPattern.correct_alternative,
          decision_id: decision.decision_id
        };
      }
    }
  }

  return null;
}

/**
 * Find canonical documentation for a topic
 * @param {string} topic - Topic to search for
 * @returns {Array} Array of canonical documentation links
 */
function findCanonicalDocs(topic) {
  const decisions = loadAllDecisions();
  const canonicalDocs = [];

  for (const decision of decisions) {
    const title = decision.title?.toLowerCase() || '';
    const context = decision.context?.toLowerCase() || '';

    if (!title.includes(topic.toLowerCase()) &&
        !context.includes(topic.toLowerCase())) {
      continue;
    }

    const docs = decision.metadata?.documentation_links || [];
    for (const doc of docs) {
      if (doc.canonicality_score >= 0.8) {
        canonicalDocs.push({
          title: doc.title,
          url: doc.url,
          canonicality_score: doc.canonicality_score,
          decision_id: decision.decision_id,
          decision_title: decision.title
        });
      }
    }
  }

  return canonicalDocs.sort((a, b) =>
    b.canonicality_score - a.canonicality_score
  );
}

/**
 * Search for decisions containing a keyword
 * @param {string} keyword - Keyword to search for
 * @returns {Array} Array of matching decisions
 */
function searchKeyword(keyword) {
  const decisions = loadAllDecisions();
  const lowerKeyword = keyword.toLowerCase();

  return decisions.filter(d => {
    const searchableText = [
      d.title,
      d.context,
      d.decision,
      d.rationale,
      JSON.stringify(d.metadata?.tags || [])
    ].join(' ').toLowerCase();

    return searchableText.includes(lowerKeyword);
  });
}

/**
 * Get migration status summary
 * @returns {Object} Migration status statistics
 */
function getMigrationStatus() {
  const decisions = loadAllDecisions();
  const migrations = decisions.filter(d => d.migration);

  const summary = {
    total_migrations: migrations.length,
    by_status: {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      ROLLED_BACK: 0
    },
    urgent: []
  };

  for (const decision of migrations) {
    const status = decision.migration.status;
    summary.by_status[status] = (summary.by_status[status] || 0) + 1;

    // Check if migration deadline is approaching
    if (decision.migration.migration_deadline) {
      const deadline = new Date(decision.migration.migration_deadline);
      const daysUntilDeadline = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline <= 30 && daysUntilDeadline > 0 && status !== 'COMPLETED') {
        summary.urgent.push({
          decision_id: decision.decision_id,
          title: decision.title,
          deadline: decision.migration.migration_deadline,
          days_remaining: daysUntilDeadline,
          status: status
        });
      }
    }
  }

  return summary;
}

/**
 * Format decision for context injection (concise format)
 * @param {Object} decision - Decision record
 * @returns {string} Concise formatted string for context injection
 */
function formatDecisionForInjection(decision) {
  const lines = [];

  // Decision header
  lines.push(`   ${decision.decision_id}: ${decision.title}`);

  // Anti-patterns (most important for context)
  if (decision.implementation?.anti_patterns?.length > 0) {
    const topAntiPatterns = decision.implementation.anti_patterns.slice(0, 2); // Top 2
    topAntiPatterns.forEach(ap => {
      lines.push(`   ❌ AVOID: ${ap.pattern}`);
      lines.push(`   ✅ USE: ${ap.correct_alternative}`);
    });
  }

  // Migration info if exists
  if (decision.migration) {
    lines.push(`   🔀 MIGRATION: ${decision.migration.old_pattern} → ${decision.migration.new_pattern}`);
  }

  // Confidence and file reference
  lines.push(`   📊 Confidence: ${decision.confidence_score} | File: ${decision._file_path}`);

  return lines.join('\n');
}

/**
 * Format decision for console output
 * @param {Object} decision - Decision record
 * @param {boolean} verbose - Show full details
 */
function formatDecision(decision, verbose = false) {
  console.log('\n' + '='.repeat(80));
  console.log(`📋 ${decision.decision_id}: ${decision.title}`);
  console.log('='.repeat(80));

  if (verbose) {
    console.log(`\n📍 Context:\n${decision.context}`);
    console.log(`\n✅ Decision:\n${decision.decision}`);
    console.log(`\n💡 Rationale:\n${decision.rationale}`);

    if (decision.alternatives?.length > 0) {
      console.log(`\n🔄 Alternatives Considered:`);
      decision.alternatives.forEach((alt, i) => {
        console.log(`\n  ${i + 1}. ${alt.option}`);
        console.log(`     ❌ Rejected: ${alt.rejected_because}`);
      });
    }

    if (decision.implementation?.anti_patterns?.length > 0) {
      console.log(`\n🚫 Anti-Patterns (WHAT NOT TO DO):`);
      decision.implementation.anti_patterns.forEach((ap, i) => {
        console.log(`\n  ${i + 1}. ❌ ${ap.pattern}`);
        console.log(`     Why wrong: ${ap.why_wrong}`);
        console.log(`     ✅ Correct: ${ap.correct_alternative}`);
      });
    }

    if (decision.migration) {
      console.log(`\n🔀 Migration:`);
      console.log(`   OLD: ${decision.migration.old_pattern}`);
      console.log(`   NEW: ${decision.migration.new_pattern}`);
      console.log(`   Status: ${decision.migration.status}`);
    }
  }

  console.log(`\n📊 Metadata:`);
  console.log(`   Confidence: ${decision.confidence_score}`);
  console.log(`   Status: ${decision.validation_status}`);
  console.log(`   Created: ${decision.metadata.created_at}`);
  console.log(`   Tags: ${decision.metadata.tags?.join(', ') || 'none'}`);
  console.log(`   File: ${decision._file_path}`);
}

/**
 * CLI Interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📋 Decision Intelligence Query Tool

Usage:
  --id <decision-id>              Query by decision ID
  --domain <domain>               Query by domain (auth, database, etc.)
  --tag <tag>                     Query by tag
  --min-confidence <score>        Filter by minimum confidence (0.0-1.0)
  --check-deprecated <pattern>    Check if pattern is deprecated
  --find-canonical <topic>        Find canonical docs for topic
  --search <keyword>              Search for keyword
  --migration-status              Show migration status summary
  --list-all                      List all decisions (summary)
  --verbose                       Show full details (use with other commands)

Examples:
  node decision-query.js --id DEC-AUTH-20250103-001
  node decision-query.js --domain auth --verbose
  node decision-query.js --tag migration
  node decision-query.js --check-deprecated "OLD_API_KEY"
  node decision-query.js --find-canonical "authentication"
  node decision-query.js --min-confidence 0.95
  node decision-query.js --migration-status
`);
    return;
  }

  const verbose = args.includes('--verbose');
  const formatForInjection = args.includes('--format-for-injection');

  try {
    if (args.includes('--id')) {
      const id = args[args.indexOf('--id') + 1];
      const decision = queryById(id);
      if (decision) {
        if (formatForInjection) {
          console.log(formatDecisionForInjection(decision));
        } else {
          formatDecision(decision, verbose);
        }
      } else {
        console.log(`❌ Decision not found: ${id}`);
      }
    }
    else if (args.includes('--domain')) {
      const domain = args[args.indexOf('--domain') + 1];
      const decisions = queryByDomain(domain);

      if (formatForInjection) {
        if (decisions.length === 0) {
          console.log(`0 decisions in domain '${domain}'`);
        } else {
          decisions.forEach(d => console.log(formatDecisionForInjection(d) + '\n'));
        }
      } else {
        console.log(`\n📂 Decisions in domain '${domain}': ${decisions.length}\n`);
        decisions.forEach(d => formatDecision(d, verbose));
      }
    }
    else if (args.includes('--tag')) {
      const tag = args[args.indexOf('--tag') + 1];
      const decisions = queryByTag(tag);

      if (formatForInjection) {
        if (decisions.length === 0) {
          console.log(`0 decisions with tag '${tag}'`);
        } else {
          decisions.forEach(d => console.log(formatDecisionForInjection(d) + '\n'));
        }
      } else {
        console.log(`\n🏷️  Decisions with tag '${tag}': ${decisions.length}\n`);
        decisions.forEach(d => formatDecision(d, verbose));
      }
    }
    else if (args.includes('--min-confidence')) {
      const minConf = parseFloat(args[args.indexOf('--min-confidence') + 1]);
      const decisions = queryByConfidence(minConf);
      console.log(`\n📊 Decisions with confidence ≥ ${minConf}: ${decisions.length}\n`);
      decisions.forEach(d => formatDecision(d, verbose));
    }
    else if (args.includes('--check-deprecated')) {
      const pattern = args[args.indexOf('--check-deprecated') + 1];
      const result = checkDeprecated(pattern);

      if (result) {
        console.log('\n⚠️  DEPRECATED PATTERN DETECTED\n');
        console.log(`Pattern: ${result.pattern}`);
        console.log(`❌ ${result.reason}`);
        if (result.new_pattern) {
          console.log(`✅ Use instead: ${result.new_pattern}`);
        }
        if (result.deprecation_date) {
          console.log(`📅 Deprecated: ${result.deprecation_date}`);
        }
        if (result.deadline) {
          console.log(`⏰ Migration deadline: ${result.deadline}`);
        }
        console.log(`📚 See: ${result.decision_id}`);
        if (result.migration_guide) {
          console.log(`🔧 Migration guide: ${result.migration_guide}`);
        }
      } else {
        console.log(`\n✅ Pattern "${pattern}" is not deprecated\n`);
      }
    }
    else if (args.includes('--find-canonical')) {
      const topic = args[args.indexOf('--find-canonical') + 1];
      const docs = findCanonicalDocs(topic);

      console.log(`\n📚 Canonical documentation for "${topic}": ${docs.length}\n`);
      docs.forEach(doc => {
        console.log(`📄 ${doc.title}`);
        console.log(`   Score: ${doc.canonicality_score.toFixed(2)}`);
        console.log(`   URL: ${doc.url}`);
        console.log(`   From: ${doc.decision_id} - ${doc.decision_title}\n`);
      });
    }
    else if (args.includes('--search')) {
      const keyword = args[args.indexOf('--search') + 1];
      const decisions = searchKeyword(keyword);
      console.log(`\n🔍 Decisions matching "${keyword}": ${decisions.length}\n`);
      decisions.forEach(d => formatDecision(d, verbose));
    }
    else if (args.includes('--migration-status')) {
      const status = getMigrationStatus();

      console.log('\n🔀 Migration Status Summary\n');
      console.log(`Total migrations: ${status.total_migrations}`);
      console.log(`\nBy Status:`);
      console.log(`  ⏸️  PENDING: ${status.by_status.PENDING}`);
      console.log(`  🔄 IN_PROGRESS: ${status.by_status.IN_PROGRESS}`);
      console.log(`  ✅ COMPLETED: ${status.by_status.COMPLETED}`);
      console.log(`  ⏪ ROLLED_BACK: ${status.by_status.ROLLED_BACK}`);

      if (status.urgent.length > 0) {
        console.log(`\n⚠️  Urgent migrations (deadline < 30 days):`);
        status.urgent.forEach(m => {
          console.log(`\n  ${m.decision_id}: ${m.title}`);
          console.log(`  Status: ${m.status}`);
          console.log(`  Deadline: ${m.deadline} (${m.days_remaining} days)`);
        });
      }
    }
    else if (args.includes('--list-all')) {
      const decisions = loadAllDecisions();
      console.log(`\n📋 All Decisions: ${decisions.length}\n`);
      decisions.forEach(d => formatDecision(d, false));
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Export functions for use as module
module.exports = {
  loadAllDecisions,
  queryById,
  queryByDomain,
  queryByTag,
  queryByConfidence,
  checkDeprecated,
  findCanonicalDocs,
  searchKeyword,
  getMigrationStatus
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
