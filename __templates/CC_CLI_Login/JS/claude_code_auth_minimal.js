/**
 * MINIMAL Claude Code Authentication Template (Node.js)
 * ======================================================
 *
 * The absolute minimum code needed to use Claude via Claude Code CLI.
 * No API keys - uses your Claude Code subscription.
 *
 * SETUP (one-time):
 *   npm install -g @anthropic-ai/claude-code
 *   claude-code login
 *   npm install @anthropic-ai/claude-agent-sdk
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

/**
 * Send a prompt to Claude, get a response. That's it.
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Claude's response
 */
async function askClaude(prompt) {
  let response = '';

  for await (const message of query({
    prompt,
    options: {
      model: 'claude-sonnet-4-5-20250514', // or any model you prefer
      maxTurns: 1,
    },
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }
    }
  }

  return response;
}

// Usage
const result = await askClaude('What is JavaScript?');
console.log(result);

export { askClaude };
