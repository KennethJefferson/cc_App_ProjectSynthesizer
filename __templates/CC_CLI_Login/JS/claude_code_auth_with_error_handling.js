/**
 * Claude Code Authentication Template with Production Error Handling (Node.js)
 * =============================================================================
 *
 * This template includes comprehensive error handling for production use.
 * Handles all common failure scenarios with actionable error messages.
 *
 * SETUP:
 *   npm install -g @anthropic-ai/claude-code
 *   claude-code login
 *   npm install @anthropic-ai/claude-agent-sdk
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import { cwd } from 'process';

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Custom error class for authentication issues
 */
class ClaudeAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClaudeAuthError';
  }
}

/**
 * Custom error class for query failures
 */
class ClaudeQueryError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ClaudeQueryError';
    this.cause = cause;
  }
}

/**
 * Verify all prerequisites are met. Throws ClaudeAuthError if not.
 *
 * Call this at application startup to fail fast with clear messages.
 * @throws {ClaudeAuthError} If prerequisites are not met
 */
function checkPrerequisites() {
  // Check 1: Claude Code CLI installed
  try {
    execSync('claude-code --version', { stdio: 'pipe' });
  } catch {
    throw new ClaudeAuthError(
      'Claude Code CLI not found!\n\n' +
      'Install with:\n' +
      '  npm install -g @anthropic-ai/claude-code\n\n' +
      'Then login:\n' +
      '  claude-code login'
    );
  }

  // Check 2: User is logged in
  try {
    const result = execSync('claude-code whoami', {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!result.trim()) {
      throw new Error('Empty response');
    }

    return result.trim(); // Return username
  } catch (error) {
    if (error.message === 'Empty response' || error.status !== 0) {
      throw new ClaudeAuthError(
        'Not logged in to Claude Code!\n\n' +
        'Login with:\n' +
        '  claude-code login\n\n' +
        'This will open your browser for authentication.'
      );
    }

    if (error.killed) {
      throw new ClaudeAuthError(
        'Claude Code CLI timed out checking login status.\n' +
        "Try running 'claude-code whoami' manually."
      );
    }

    throw new ClaudeAuthError('Claude Code CLI not found in PATH');
  }
}

// =============================================================================
// QUERY FUNCTION WITH FULL ERROR HANDLING
// =============================================================================

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query Claude with comprehensive error handling and retries.
 *
 * @param {Object} options - Query options
 * @param {string} options.prompt - User prompt to send
 * @param {string} [options.model='claude-sonnet-4-5-20250514'] - Full model ID
 * @param {string} [options.systemPrompt] - Optional system prompt for agent persona
 * @param {number} [options.maxRetries=3] - Number of retry attempts on transient failures
 * @param {number} [options.timeoutMs=120000] - Maximum time to wait for response in ms
 * @returns {Promise<string|null>} Claude's response text, or null if all retries failed
 * @throws {ClaudeAuthError} If authentication is not set up
 */
async function safeQuery({
  prompt,
  model = 'claude-sonnet-4-5-20250514',
  systemPrompt = null,
  maxRetries = 3,
  timeoutMs = 120000,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let fullResponse = '';

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const queryOptions = {
          model,
          maxTurns: 1,
          cwd: cwd(),
        };

        if (systemPrompt) {
          queryOptions.systemPrompt = systemPrompt;
        }

        for await (const message of query({
          prompt,
          options: queryOptions,
        })) {
          // Check if aborted
          if (controller.signal.aborted) {
            throw new Error('Query timed out');
          }

          if (message.type === 'assistant') {
            for (const block of message.message.content) {
              if (block.type === 'text') {
                fullResponse += block.text;
              }
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (fullResponse) {
        return fullResponse;
      } else {
        console.log(`[WARNING] Empty response on attempt ${attempt}/${maxRetries}`);
      }
    } catch (error) {
      lastError = error;

      // Check for CLI not found - don't retry
      if (error.message?.includes('not found') || error.message?.includes('ENOENT')) {
        throw new ClaudeAuthError(
          'Claude Code CLI not found!\n' +
          'Install: npm install -g @anthropic-ai/claude-code\n' +
          'Login: claude-code login'
        );
      }

      // Check for timeout
      if (error.message?.includes('timed out') || error.name === 'AbortError') {
        console.log(`[ERROR] Request timed out after ${timeoutMs / 1000} seconds`);
      } else if (error.code === 1 || error.exitCode === 1) {
        // Exit code 1 often means auth issue
        console.log('[ERROR] CLI process failed (exit code 1)');
        console.log('This often means you need to re-login:');
        console.log('  claude-code login');
      } else {
        console.log(`[ERROR] ${error.name || 'Error'}: ${error.message}`);
      }

      // Retry with exponential backoff
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff in ms
        console.log(`[RETRY] Waiting ${waitTime / 1000}s before retry ${attempt + 1}...`);
        await sleep(waitTime);
      }
    }
  }

  // All retries exhausted
  console.log(`[FAILED] All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
  return null;
}

// =============================================================================
// CONVENIENCE WRAPPER
// =============================================================================

/**
 * Simple wrapper that checks prerequisites and makes a query.
 * Use this for one-off queries where you want automatic prerequisite checking.
 *
 * @param {string} prompt - The prompt to send
 * @param {Object} [options] - Optional query options
 * @returns {Promise<string>} Claude's response
 * @throws {ClaudeAuthError} If authentication is not set up
 * @throws {ClaudeQueryError} If query fails after all retries
 */
async function askClaude(prompt, options = {}) {
  // Check prerequisites on first call
  checkPrerequisites();

  const response = await safeQuery({ prompt, ...options });

  if (!response) {
    throw new ClaudeQueryError('Query failed after all retries');
  }

  return response;
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example showing production-ready error handling
 */
async function main() {
  console.log('Claude Code Authentication - Production Example (Node.js)\n');

  // Step 1: Check prerequisites at startup (fail fast)
  try {
    const user = checkPrerequisites();
    console.log(`[OK] Prerequisites verified - logged in as: ${user}\n`);
  } catch (error) {
    if (error instanceof ClaudeAuthError) {
      console.log(`[SETUP ERROR]\n${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  // Step 2: Make a query with full error handling
  const response = await safeQuery({
    prompt: 'Explain JavaScript promises in one sentence.',
    model: 'claude-3-haiku-20240307', // Cheapest for demo
    maxRetries: 3,
    timeoutMs: 30000,
  });

  if (response) {
    console.log(`Response: ${response.trim()}`);
  } else {
    console.log('Query failed after all retries');
    process.exit(1);
  }
}

// Run if this is the main module
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Export for use as a module
export {
  ClaudeAuthError,
  ClaudeQueryError,
  checkPrerequisites,
  safeQuery,
  askClaude,
};
