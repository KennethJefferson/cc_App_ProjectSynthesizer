# Claude Code CLI Authentication Prompt (Node.js/JavaScript)

Use this prompt when starting a new Claude Agent project in Node.js that should use Claude Code subscription authentication instead of API keys.

---

## The Prompt

```
I need to create a Node.js/JavaScript application that uses Claude AI through the Claude Agent SDK.

IMPORTANT REQUIREMENTS:
1. Use Claude Code CLI authentication (NOT direct API keys)
2. Authentication happens through `claude-code login` (npm package)
3. No API key management needed in code or environment variables
4. Uses existing Claude Code subscription billing

Please use the templates in `__templates/JS/` as reference:
- `claude_code_auth_template.js` - Full documented template with examples
- `claude_code_auth_minimal.js` - Bare minimum code to get started
- `claude_code_auth_with_error_handling.js` - Production-ready with retries

KEY PATTERNS TO FOLLOW:
1. Import from `@anthropic-ai/claude-agent-sdk`
2. Use `query()` async generator function for Claude interactions
3. Configure options object with model, maxTurns, etc.
4. Handle errors gracefully with try/catch
5. No API key needed - CLI handles authentication

PREREQUISITES (user must do once):
```bash
npm install -g @anthropic-ai/claude-code
claude-code login
npm install @anthropic-ai/claude-agent-sdk
```

The core pattern is:
```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function askClaude(prompt) {
  let response = '';

  for await (const message of query({
    prompt,
    options: {
      model: 'claude-sonnet-4-5-20250514',
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
```
```

---

## Quick Reference

### Available Models
```javascript
const AVAILABLE_MODELS = {
  'opus': 'claude-3-opus-20240229',           // Most capable
  'sonnet': 'claude-3-sonnet-20240229',       // Balanced
  'haiku': 'claude-3-haiku-20240307',         // Fast/cheap
  'sonnet-3.5': 'claude-3-5-sonnet-20241022', // Better than opus
  'sonnet-4.5': 'claude-sonnet-4-5-20250514', // Latest (DEFAULT)
};
```

### Required Imports
```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';  // For CLI verification
```

### Key Differences from Direct API

| Aspect | Direct API (@anthropic-ai/sdk) | Claude Code CLI (@anthropic-ai/claude-agent-sdk) |
|--------|--------------------------------|--------------------------------------------------|
| Auth | API key in code/env | `claude-code login` (one-time) |
| Package | `npm install @anthropic-ai/sdk` | `npm install @anthropic-ai/claude-agent-sdk` + CLI |
| Billing | Separate API billing | Claude Code subscription |
| Function | `client.messages.create()` | `for await (msg of query())` |
| Response | `message.content` | Iterate through async generator |

### Template Files

1. **`claude_code_auth_template.js`** - Start here
   - Full documentation
   - Verification functions
   - Simple and advanced examples
   - Streaming example

2. **`claude_code_auth_minimal.js`** - Quickest start
   - Under 40 lines
   - Just the essentials
   - Copy-paste ready

3. **`claude_code_auth_with_error_handling.js`** - Production ready
   - Prerequisite checking
   - Retry logic with exponential backoff
   - Timeout handling
   - Custom error classes

---

## Common Issues

### "Claude Code CLI not found"
```bash
npm install -g @anthropic-ai/claude-code
```

### "Not logged in"
```bash
claude-code login
```

### "Permission denied" on Windows
Run terminal as administrator for npm global install, or use:
```bash
npm install -g @anthropic-ai/claude-code --prefix %APPDATA%\npm
```

### Rate limiting
- Add delays between requests: `await new Promise(r => setTimeout(r, 1000))`
- Use exponential backoff on retries
- Consider using `haiku` model for high-volume tasks

### ESM vs CommonJS
The templates use ES modules (ESM). Ensure your `package.json` has:
```json
{
  "type": "module"
}
```

Or use `.mjs` file extension.

---

## Message Types

When iterating over `query()`, you'll receive different message types:

```javascript
for await (const message of query({ prompt, options })) {
  switch (message.type) {
    case 'assistant':
      // Claude's response
      // message.message.content contains TextBlock[] or ToolUseBlock[]
      break;
    case 'user':
      // User message (for multi-turn conversations)
      break;
    case 'result':
      // Final result with metadata
      // message.subtype: 'success' | 'error' | 'interrupted'
      // message.duration_ms: number
      // message.total_cost_usd: number
      break;
  }
}
```

---

## Advanced Options

```javascript
const options = {
  model: 'claude-sonnet-4-5-20250514',  // Model to use
  maxTurns: 1,                           // Number of conversation turns
  systemPrompt: 'You are helpful...',    // Custom system prompt
  allowedTools: ['Read', 'Write'],       // Tools the agent can use
  disallowedTools: ['Bash'],             // Tools the agent cannot use
  permissionMode: 'default',             // Tool permission handling
  cwd: process.cwd(),                    // Working directory
};
```
