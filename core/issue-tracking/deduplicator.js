#!/usr/bin/env node

/**
 * Issue Deduplicator - Prevent duplicate issue creation using semantic similarity
 *
 * Three-level deduplication strategy:
 * 1. Exact Match (10ms) - Same error + same file
 * 2. Semantic Similarity (200ms) - Ollama embeddings + cosine similarity
 * 3. Component Grouping (500ms) - Related issues in same component
 *
 * @module issue-tracking/deduplicator
 */

const fs = require('fs');
const path = require('path');

/**
 * Load embeddings cache
 * @returns {Object} Embeddings cache
 */
function loadEmbeddingsCache() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const cachePath = path.join(memoryDir, 'issue-tracking', 'embeddings-cache.json');

    if (!fs.existsSync(cachePath)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load embeddings cache:', error.message);
    return {};
  }
}

/**
 * Save embeddings cache
 * @param {Object} cache - Embeddings cache
 */
function saveEmbeddingsCache(cache) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const issueTrackingDir = path.join(memoryDir, 'issue-tracking');
    const cachePath = path.join(issueTrackingDir, 'embeddings-cache.json');

    if (!fs.existsSync(issueTrackingDir)) {
      fs.mkdirSync(issueTrackingDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Failed to save embeddings cache:', error.message);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Level 1: Exact match detection
 * @param {Object} newContext - New error context
 * @param {Array} existingIssues - Existing open issues
 * @returns {Object|null} Match result or null
 */
function exactMatch(newContext, existingIssues) {
  for (const issue of existingIssues) {
    // Same error message + same file = exact duplicate
    if (issue.error_message === newContext.error_message &&
        issue.file === newContext.file) {
      return {
        isDuplicate: true,
        confidence: 1.0,
        matchedIssue: issue,
        method: 'exact'
      };
    }
  }

  return null;
}

/**
 * Level 2: Semantic similarity using Ollama embeddings
 * @param {Object} newContext - New error context
 * @param {Array} existingIssues - Existing open issues
 * @param {number} threshold - Similarity threshold (default: 0.95)
 * @returns {Promise<Object|null>} Match result or null
 */
async function semanticMatch(newContext, existingIssues, threshold = 0.95) {
  try {
    // Load Ollama client
    const ollamaClientPath = path.join(__dirname, '../lib/ollama-client.js');

    if (!fs.existsSync(ollamaClientPath)) {
      console.warn('Ollama client not found. Semantic matching disabled.');
      return null;
    }

    const OllamaClient = require(ollamaClientPath);
    const cache = loadEmbeddingsCache();

    // Generate text for embedding (error message + file)
    const newText = `${newContext.error_message} ${newContext.file || ''}`.trim();

    // Generate embedding for new error
    let newEmbedding = cache[newText];

    if (!newEmbedding) {
      try {
        newEmbedding = await OllamaClient.generateEmbedding(newText);
        cache[newText] = newEmbedding;
        saveEmbeddingsCache(cache);
      } catch (error) {
        console.warn('Failed to generate embedding:', error.message);
        return null;
      }
    }

    // Check similarity with existing issues
    for (const issue of existingIssues) {
      const issueText = `${issue.error_message} ${issue.file || ''}`.trim();

      // Check cache first
      let issueEmbedding = cache[issueText];

      if (!issueEmbedding) {
        try {
          issueEmbedding = await OllamaClient.generateEmbedding(issueText);
          cache[issueText] = issueEmbedding;
          saveEmbeddingsCache(cache);
        } catch (error) {
          console.warn('Failed to generate embedding for issue:', error.message);
          continue;
        }
      }

      // Calculate cosine similarity
      const similarity = cosineSimilarity(newEmbedding, issueEmbedding);

      // Threshold: 95% similarity = duplicate
      if (similarity >= threshold) {
        return {
          isDuplicate: true,
          confidence: similarity,
          matchedIssue: issue,
          method: 'semantic'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Semantic matching error:', error.message);
    return null;
  }
}

/**
 * Extract component from file path
 * @param {string} filePath - File path
 * @returns {string|null} Component name
 */
function extractComponent(filePath) {
  if (!filePath) return null;

  const parts = filePath.split('/');

  // Common component patterns
  // e.g., src/components/Auth/Login.tsx -> Auth
  // e.g., src/lib/database/client.ts -> database

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Skip common prefixes
    if (['src', 'lib', 'core', 'app', 'components', 'pages'].includes(part)) {
      continue;
    }

    // Return first meaningful part
    if (part && !part.includes('.')) {
      return part;
    }
  }

  return null;
}

/**
 * Level 3: Component-level grouping
 * @param {Object} newContext - New error context
 * @param {Array} existingIssues - Existing open issues
 * @returns {Object|null} Related issues or null
 */
function componentMatch(newContext, existingIssues) {
  const newComponent = extractComponent(newContext.file);

  if (!newComponent) {
    return null;
  }

  const relatedIssues = existingIssues.filter(issue => {
    const issueComponent = extractComponent(issue.file);
    return issueComponent === newComponent;
  });

  if (relatedIssues.length > 0) {
    return {
      isDuplicate: false, // Not exact duplicate
      isRelated: true,
      relatedIssues: relatedIssues.map(i => i.github_issue_number || i.internal_id),
      component: newComponent
    };
  }

  return null;
}

/**
 * Load open issues from state
 * @returns {Promise<Array>} Open issues
 */
async function loadOpenIssues() {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const statePath = path.join(memoryDir, 'issue-tracking', 'state.json');

    if (!fs.existsSync(statePath)) {
      return [];
    }

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    return state.issues?.filter(i => i.status !== 'CLOSED') || [];
  } catch (error) {
    console.error('Failed to load open issues:', error.message);
    return [];
  }
}

/**
 * Master deduplication function
 * @param {Object} newContext - New error context
 * @param {Object} options - Deduplication options
 * @returns {Promise<Object>} Deduplication result
 */
async function checkDuplicate(newContext, options = {}) {
  const {
    enableExact = true,
    enableSemantic = true,
    enableComponent = true,
    semanticThreshold = 0.95
  } = options;

  const existingIssues = await loadOpenIssues();

  if (existingIssues.length === 0) {
    return {
      isDuplicate: false,
      relatedIssues: [],
      confidence: 0.0
    };
  }

  // Level 1: Exact match (fast path)
  if (enableExact) {
    const exactResult = exactMatch(newContext, existingIssues);
    if (exactResult?.isDuplicate) {
      return exactResult;
    }
  }

  // Level 2: Semantic similarity
  if (enableSemantic) {
    const semanticResult = await semanticMatch(newContext, existingIssues, semanticThreshold);
    if (semanticResult?.isDuplicate) {
      return semanticResult;
    }
  }

  // Level 3: Component grouping (for related issues)
  if (enableComponent) {
    const componentResult = componentMatch(newContext, existingIssues);

    if (componentResult?.isRelated) {
      return {
        isDuplicate: false,
        isRelated: true,
        relatedIssues: componentResult.relatedIssues,
        component: componentResult.component,
        confidence: 0.0
      };
    }
  }

  return {
    isDuplicate: false,
    relatedIssues: [],
    confidence: 0.0
  };
}

/**
 * Log deduplication event
 * @param {Object} newContext - New error context
 * @param {Object} result - Deduplication result
 */
function logDeduplication(newContext, result) {
  try {
    const memoryDir = process.env.MEMORY_DIR || path.join(process.cwd(), '.memories');
    const logsDir = path.join(memoryDir, 'issue-tracking', 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}-deduplication.log`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      isDuplicate: result.isDuplicate,
      method: result.method,
      confidence: result.confidence,
      matchedIssue: result.matchedIssue?.github_issue_number || result.matchedIssue?.internal_id,
      relatedIssues: result.relatedIssues,
      error_preview: newContext.error_message.substring(0, 100)
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log deduplication:', error.message);
  }
}

module.exports = {
  checkDuplicate,
  exactMatch,
  semanticMatch,
  componentMatch,
  loadOpenIssues,
  cosineSimilarity,
  logDeduplication
};
