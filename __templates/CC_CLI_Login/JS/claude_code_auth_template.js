/**
 * Claude Code CLI Authentication Template (Node.js/JavaScript)
 * =============================================================
 *
 * This template demonstrates how to use Claude Agent SDK with Claude Code CLI
 * authentication instead of direct API keys. This approach uses your Claude Code
 * subscription (via npm package) rather than paying separately for API usage.
 *
 * AUTHENTICATION FLOW:
 * --------------------
 * 1. User installs Claude Code CLI: npm install -g @anthropic-ai/claude-code
 * 2. User logs in once: claude-code login (opens browser for OAuth)
 * 3. Node.js SDK automatically uses CLI authentication - NO API KEY NEEDED
 * 4. All API calls are billed through Claude Code subscription
 *
 * PREREQUISITES:
 * --------------
 * 1. Node.js installed (v18+)
 * 2. Claude Code CLI: npm install -g @anthropic-ai/claude-code
 * 3. Login once: claude-code login
 * 4. Install SDK: npm install @anthropic-ai/claude-agent-sdk
 *
 * BENEFITS:
 * ---------
 * - No API key management in code or environment variables
 * - Uses existing Claude Code subscription billing
 * - Automatic token refresh handled by CLI
 * - Same models available as direct API
 *
 * Author: Template generated for Claude Code CLI authentication
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import { cwd } from 'process';

// =============================================================================
// AVAILABLE MODELS
// =============================================================================
// These are the models available through Claude Code CLI
// The SDK will automatically use these via CLI authentication

const AVAILABLE_MODELS = {
  // Claude 3 Family
  opus: 'claude-3-opus-20240229',           // Most capable, highest cost
  sonnet: 'claude-3-sonnet-20240229',       // Balanced performance/cost
  haiku: 'claude-3-haiku-20240307',         // Fast, cheapest

  // Claude 3.5 (Better than Claude 3)
  'sonnet-3.5': 'claude-3-5-sonnet-20241022', // Recommended for most tasks

  // Claude 4.5 (Latest generation)
  'sonnet-4.5': 'claude-sonnet-4-5-20250514', // Latest, best quality
};

const DEFAULT_MODEL = 'sonnet-4.5';

// =============================================================================
// AUTHENTICATION VERIFICATION
// =============================================================================

/**
 * Verify Claude Code CLI is installed and accessible.
 * @returns {boolean} True if CLI is available
 */
function verifyCLIInstallation() {
  try {
    execSync('claude-code --version', { stdio: 'pipe' });
    console.log('[OK] Claude Code CLI found');
    return true;
  } catch {
    console.log('[ERROR] Claude Code CLI not found!');
    console.log('Install with: npm install -g @anthropic-ai/claude-code');
    return false;
  }
}

/**
 * Verify user is logged into Claude Code CLI.
 * @returns {boolean} True if logged in
 */
function verifyCLILogin() {
  try {
    const result = execSync('claude-code whoami', {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`[OK] Logged in as: ${result.trim()}`);
    return true;
  } catch (error) {
    console.log('[ERROR] Not logged in to Claude Code CLI!');
    console.log('Login with: claude-code login');
    return false;
  }
}

// =============================================================================
// BASIC QUERY EXAMPLE
// =============================================================================

/**
 * Make a simple query to Claude using Claude Code CLI authentication.
 *
 * This is the most basic usage pattern. The SDK automatically handles
 * authentication through the CLI - no API key needed!
 *
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} model - Model alias from AVAILABLE_MODELS (default: sonnet-4.5)
 * @returns {Promise<string|null>} Claude's response text, or null if failed
 */
async function simpleQuery(prompt, model = DEFAULT_MODEL) {
  // Resolve model alias to full model ID
  const modelId = AVAILABLE_MODELS[model] || AVAILABLE_MODELS[DEFAULT_MODEL];

  try {
    // The query() function is async and yields response chunks
    let fullResponse = '';

    for await (const message of query({
      prompt,
      options: {
        model: modelId,
        maxTurns: 1, // Single response (no conversation)
        cwd: cwd(),  // Working directory for file operations
      },
    })) {
      // Extract text from assistant messages
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          }
        }
      }
    }

    return fullResponse || null;
  } catch (error) {
    if (error.message?.includes('not found')) {
      console.log('[ERROR] Claude Code CLI not installed or not in PATH');
      console.log('Install: npm install -g @anthropic-ai/claude-code');
    } else {
      console.log(`[ERROR] Query failed: ${error.message}`);
    }
    return null;
  }
}

// =============================================================================
// ADVANCED QUERY WITH SYSTEM PROMPT
// =============================================================================

/**
 * Query Claude with a custom system prompt (persona) and tool configuration.
 *
 * This pattern is useful for creating specialized agents with specific
 * personalities or capabilities.
 *
 * @param {string} prompt - User prompt to send
 * @param {string} systemPrompt - Custom system prompt defining agent behavior
 * @param {string} model - Model alias from AVAILABLE_MODELS
 * @param {string[]} allowedTools - List of tools agent CAN use (e.g., ["Read", "Write"])
 * @param {string[]} disallowedTools - List of tools agent CANNOT use
 * @returns {Promise<string|null>} Claude's response text, or null if failed
 */
async function queryWithPersona(
  prompt,
  systemPrompt,
  model = DEFAULT_MODEL,
  allowedTools = [],
  disallowedTools = []
) {
  const modelId = AVAILABLE_MODELS[model] || AVAILABLE_MODELS[DEFAULT_MODEL];

  try {
    let fullResponse = '';

    for await (const message of query({
      prompt,
      options: {
        systemPrompt,
        model: modelId,
        allowedTools,
        disallowedTools,
        permissionMode: 'default', // Respect allowed/disallowed tools
        maxTurns: 1,
        cwd: cwd(),
      },
    })) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          }
        }
      }
    }

    return fullResponse || null;
  } catch (error) {
    console.log(`[ERROR] Query failed: ${error.message}`);
    return null;
  }
}

// =============================================================================
// STREAMING RESPONSE EXAMPLE
// =============================================================================

/**
 * Stream Claude's response chunk by chunk.
 *
 * Useful for displaying real-time output to users.
 *
 * @param {string} prompt - The prompt to send
 * @param {string} model - Model alias
 * @yields {string} Text chunks as they arrive
 */
async function* streamingQuery(prompt, model = DEFAULT_MODEL) {
  const modelId = AVAILABLE_MODELS[model] || AVAILABLE_MODELS[DEFAULT_MODEL];

  try {
    for await (const message of query({
      prompt,
      options: {
        model: modelId,
        maxTurns: 1,
        cwd: cwd(),
      },
    })) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            yield block.text;
          }
        }
      }
    }
  } catch (error) {
    console.log(`[ERROR] Streaming failed: ${error.message}`);
  }
}

// =============================================================================
// MAIN EXAMPLE USAGE
// =============================================================================

/**
 * Example usage demonstrating Claude Code CLI authentication.
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Claude Code CLI Authentication Demo (Node.js)');
  console.log('='.repeat(60) + '\n');

  // Step 1: Verify prerequisites
  console.log('[1/3] Checking prerequisites...');

  if (!verifyCLIInstallation()) {
    console.log('\nSetup Instructions:');
    console.log('  1. Install Node.js from https://nodejs.org');
    console.log('  2. Run: npm install -g @anthropic-ai/claude-code');
    console.log('  3. Run: claude-code login');
    process.exit(1);
  }

  if (!verifyCLILogin()) {
    console.log('\nPlease login:');
    console.log('  Run: claude-code login');
    process.exit(1);
  }

  console.log();

  // Step 2: Simple query
  console.log('[2/3] Making a simple query...');

  const response = await simpleQuery(
    'What is 2 + 2? Reply with just the number.',
    'haiku' // Use cheapest model for demo
  );

  if (response) {
    console.log(`Response: ${response.trim()}`);
  } else {
    console.log('Query failed!');
    process.exit(1);
  }

  console.log();

  // Step 3: Query with persona
  console.log('[3/3] Query with custom persona...');

  const expertPrompt = `You are a JavaScript expert.
When asked about code, provide concise, practical answers.
Focus on best practices and real-world usage.`;

  const expertResponse = await queryWithPersona(
    "What's the best way to read a JSON file in Node.js?",
    expertPrompt,
    'haiku',
    ['Read'],           // Only allow file reading
    ['Write', 'Bash']   // Prevent modifications
  );

  if (expertResponse) {
    console.log(`Expert Response:\n${expertResponse.slice(0, 500)}...`); // Truncate for demo
  }

  console.log('\n' + '='.repeat(60));
  console.log('Demo Complete!');
  console.log('='.repeat(60));
}

// Run if this is the main module
main().catch(console.error);

// Export functions for use as a module
export {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  verifyCLIInstallation,
  verifyCLILogin,
  simpleQuery,
  queryWithPersona,
  streamingQuery,
};
