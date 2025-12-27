/**
 * Build script for CCProjectSynth with OpenTUI/SolidJS support
 *
 * IMPORTANT: This script is required because Bun's default bundler
 * uses React's JSX transform. We need to use the solid plugin to
 * properly transform JSX for SolidJS/OpenTUI.
 */

import solidPlugin from '@opentui/solid/scripts/solid-plugin.ts';

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'bun',
  plugins: [solidPlugin],
  external: ['@anthropic-ai/claude-agent-sdk'],
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('Build successful!');
console.log(`Output: ${result.outputs.map(o => o.path).join(', ')}`);
