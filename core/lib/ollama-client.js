#!/usr/bin/env node

/**
 * Ollama LLM Client for Hybrid Intent Analysis
 *
 * Provides a clean abstraction layer for LLM-based intent enhancement with:
 * - Health check caching (avoid repeated Ollama availability checks)
 * - Timeout protection (configurable hard limit)
 * - Graceful error handling (always return null on failure)
 * - Connection pooling (reuse Ollama client)
 * - Performance metrics tracking
 *
 * Usage:
 *   const OllamaClient = require('./ollama-client');
 *
 *   // Check availability (cached)
 *   const available = await OllamaClient.isAvailable();
 *
 *   // Enhance intent
 *   const enhanced = await OllamaClient.enhanceIntent(prompt, regexResult);
 */

const fs = require('fs');
const path = require('path');

// Configuration - dynamically resolved based on project structure
const PROJECT_ROOT = findProjectRoot();
const CONFIG_PATH = path.join(PROJECT_ROOT, '.claude/config/llm-enhancement.json');
const DEFAULT_CONFIG = {
  enabled: true,
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:1b',
    timeout_ms: parseInt(process.env.OLLAMA_TIMEOUT_MS || '500'),
    health_check_ttl_ms: 300000  // 5 minutes
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

/**
 * Find project root by looking for .claude directory
 * @returns {string} Project root path
 */
function findProjectRoot() {
  let currentDir = process.cwd();

  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, '.claude'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

// Load configuration (with fallback)
let config;
try {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } else {
    config = DEFAULT_CONFIG;
  }
} catch (error) {
  console.error('[OllamaClient] Failed to load config, using defaults:', error.message);
  config = DEFAULT_CONFIG;
}

// Lazy-load Ollama client (only when needed)
let ollamaClient = null;

/**
 * Get or create Ollama client (singleton pattern)
 */
async function getOllamaClient() {
  if (!ollamaClient && config.performance.reuse_client) {
    try {
      // Dynamic import for ES module
      const { Ollama } = await import('ollama');
      ollamaClient = new Ollama({ host: config.ollama.host });
    } catch (error) {
      throw new Error(`Failed to initialize Ollama client: ${error.message}`);
    }
  } else if (!ollamaClient) {
    // Create new client each time if reuse disabled
    const { Ollama } = await import('ollama');
    return new Ollama({ host: config.ollama.host });
  }

  return ollamaClient;
}

// Health check cache
const healthCache = {
  available: false,
  lastCheck: 0,
  ttl: config.ollama.health_check_ttl_ms
};

// Performance metrics
const metrics = {
  llm_requests_total: 0,
  llm_requests_success: 0,
  llm_requests_failed: 0,
  llm_requests_timeout: 0,
  llm_avg_latency_ms: 0,
  fallback_to_regex_count: 0,
  domains_added_count: 0,
  tags_added_count: 0
};

/**
 * Check if Ollama is available (with caching)
 * @returns {Promise<boolean>} True if Ollama is running and responsive
 */
async function isAvailable() {
  // Return cached result if still valid
  const now = Date.now();
  if (config.performance.cache_health_checks &&
      now - healthCache.lastCheck < healthCache.ttl) {
    return healthCache.available;
  }

  // Perform health check
  try {
    const client = await getOllamaClient();

    // Simple API call to verify connectivity (fast)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 2000)
    );

    const healthPromise = client.list();

    await Promise.race([healthPromise, timeoutPromise]);

    healthCache.available = true;
    healthCache.lastCheck = now;
    return true;

  } catch (error) {
    healthCache.available = false;
    healthCache.lastCheck = now;

    if (config.fallback.log_failures) {
      console.error('[OllamaClient] Health check failed:', error.message);
    }

    return false;
  }
}

/**
 * Build LLM prompt for intent enhancement
 * @param {string} userPrompt - Original user prompt
 * @param {Object} regexResult - Baseline regex analysis result
 * @param {Array<string>} availableDomains - List of available domains for this project
 * @returns {string} Formatted prompt for LLM
 */
function buildLLMPrompt(userPrompt, regexResult, availableDomains = []) {
  const regexResultJSON = JSON.stringify(regexResult, null, 2);
  const domainsList = availableDomains.length > 0
    ? availableDomains.join(', ')
    : 'auth, database, api, ui, testing, infra, arch';

  return `You are an intent analysis assistant. Analyze this user prompt and enhance the domain/tag detection.

USER PROMPT:
"""
${userPrompt}
"""

REGEX ANALYSIS (baseline):
${regexResultJSON}

YOUR TASK:
1. Review the regex analysis results
2. Identify ADDITIONAL domains that regex missed (semantic understanding)
3. Identify ADDITIONAL tags that provide more context
4. Assign a confidence score (0.0-1.0) for your analysis
5. Briefly explain your reasoning

AVAILABLE DOMAINS:
${domainsList}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "additional_domains": ["domain1", "domain2"],
  "additional_tags": ["tag1", "tag2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of why you added these domains/tags"
}

RULES:
- ONLY suggest domains from the available list
- Be conservative (don't over-tag)
- Consider implicit relationships (e.g., auth often needs database)
- Confidence > 0.9 means very certain
- Return ONLY valid JSON, no markdown formatting`;
}

/**
 * Parse LLM response and validate structure
 * @param {string} response - Raw LLM response
 * @returns {Object|null} Parsed and validated response, or null if invalid
 */
function parseLLMResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!Array.isArray(parsed.additional_domains)) {
      throw new Error('Missing or invalid additional_domains');
    }
    if (!Array.isArray(parsed.additional_tags)) {
      throw new Error('Missing or invalid additional_tags');
    }
    if (typeof parsed.confidence !== 'number' ||
        parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error('Missing or invalid confidence (must be 0.0-1.0)');
    }

    return {
      additional_domains: parsed.additional_domains || [],
      additional_tags: parsed.additional_tags || [],
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || null
    };

  } catch (error) {
    if (config.fallback.log_failures) {
      console.error('[OllamaClient] Failed to parse LLM response:', error.message);
      console.error('[OllamaClient] Raw response:', response);
    }
    return null;
  }
}

/**
 * Enhance intent with LLM (with timeout protection)
 * @param {string} userPrompt - Original user prompt
 * @param {Object} regexResult - Baseline regex analysis result
 * @param {Array<string>} availableDomains - Optional list of available domains
 * @returns {Promise<Object|null>} Enhanced intent or null on failure
 */
async function enhanceIntent(userPrompt, regexResult, availableDomains = []) {
  if (!config.enabled) {
    return null;  // Feature disabled
  }

  const startTime = Date.now();

  try {
    metrics.llm_requests_total++;

    const client = await getOllamaClient();
    const prompt = buildLLMPrompt(userPrompt, regexResult, availableDomains);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('LLM timeout')),
        config.ollama.timeout_ms
      )
    );

    // Create LLM request promise
    const llmPromise = client.chat({
      model: config.ollama.model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,  // No streaming for simplicity (could optimize later)
      format: 'json',  // Request JSON format
      options: {
        temperature: 0.3,  // Low temperature for consistency
        num_predict: 200   // Limit response length
      }
    });

    // Race between LLM and timeout
    const response = await Promise.race([llmPromise, timeoutPromise]);

    // Parse and validate response
    const parsed = parseLLMResponse(response.message.content);

    if (parsed) {
      const duration = Date.now() - startTime;

      // Update metrics
      metrics.llm_requests_success++;
      metrics.domains_added_count += parsed.additional_domains.length;
      metrics.tags_added_count += parsed.additional_tags.length;

      // Update rolling average latency
      const alpha = 0.1;  // Smoothing factor
      metrics.llm_avg_latency_ms =
        alpha * duration + (1 - alpha) * metrics.llm_avg_latency_ms;

      return parsed;
    } else {
      metrics.llm_requests_failed++;
      return null;
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    if (error.message === 'LLM timeout') {
      metrics.llm_requests_timeout++;
    } else {
      metrics.llm_requests_failed++;
    }

    if (config.fallback.log_failures) {
      console.error(`[OllamaClient] Enhancement failed (${duration}ms):`, error.message);
    }

    // Update health cache if connection failed
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      healthCache.available = false;
      healthCache.lastCheck = Date.now();
    }

    return null;  // Graceful fallback
  }
}

/**
 * Get current status and metrics
 * @returns {Object} Status and performance metrics
 */
function getStatus() {
  return {
    available: healthCache.available,
    lastCheck: healthCache.lastCheck,
    model: config.ollama.model,
    host: config.ollama.host,
    enabled: config.enabled,
    avgLatency: Math.round(metrics.llm_avg_latency_ms),
    metrics: {
      total_requests: metrics.llm_requests_total,
      success_requests: metrics.llm_requests_success,
      failed_requests: metrics.llm_requests_failed,
      timeout_requests: metrics.llm_requests_timeout,
      success_rate: metrics.llm_requests_total > 0
        ? (metrics.llm_requests_success / metrics.llm_requests_total * 100).toFixed(1) + '%'
        : 'N/A',
      domains_added: metrics.domains_added_count,
      tags_added: metrics.tags_added_count,
      avg_latency_ms: Math.round(metrics.llm_avg_latency_ms)
    }
  };
}

/**
 * Get raw metrics
 * @returns {Object} Raw metrics object
 */
function getMetrics() {
  return { ...metrics };
}

/**
 * Reset metrics (for testing)
 */
function resetMetrics() {
  metrics.llm_requests_total = 0;
  metrics.llm_requests_success = 0;
  metrics.llm_requests_failed = 0;
  metrics.llm_requests_timeout = 0;
  metrics.llm_avg_latency_ms = 0;
  metrics.fallback_to_regex_count = 0;
  metrics.domains_added_count = 0;
  metrics.tags_added_count = 0;
}

/**
 * CLI Interface for testing
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const status = getStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (args.includes('--health')) {
    const available = await isAvailable();
    console.log(`Ollama available: ${available}`);
    return;
  }

  if (args.includes('--test')) {
    console.log('Testing Ollama client...\n');

    // Test health check
    console.log('1. Health check...');
    const available = await isAvailable();
    console.log(`   ${available ? '✅' : '❌'} Ollama ${available ? 'available' : 'unavailable'}\n`);

    if (!available) {
      console.log('⚠️  Ollama is not running. Start with: ollama serve');
      return;
    }

    // Test intent enhancement
    console.log('2. Testing intent enhancement...');
    const testPrompt = 'Implement authentication with deprecated API key';
    const testRegexResult = {
      domains: ['auth'],
      tags: ['api'],
      patterns: ['deprecated'],
      actions: ['implement']
    };

    const enhanced = await enhanceIntent(testPrompt, testRegexResult);

    if (enhanced) {
      console.log('   ✅ Enhancement successful:');
      console.log(JSON.stringify(enhanced, null, 2));
    } else {
      console.log('   ❌ Enhancement failed (see logs above)');
    }

    // Show metrics
    console.log('\n3. Performance metrics:');
    const status = getStatus();
    console.log(`   Average latency: ${status.avgLatency}ms`);
    console.log(`   Success rate: ${status.metrics.success_rate}`);

    return;
  }

  // Default: show usage
  console.log(`
Ollama Client CLI

Usage:
  --status    Show detailed status and metrics
  --health    Check Ollama availability
  --test      Run integration test

Examples:
  node ollama-client.js --status
  node ollama-client.js --health
  node ollama-client.js --test
  `);
}

// Export module
module.exports = {
  isAvailable,
  enhanceIntent,
  getStatus,
  getMetrics,
  resetMetrics
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
