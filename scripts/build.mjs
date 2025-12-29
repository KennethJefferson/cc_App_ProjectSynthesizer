/**
 * Build script for CCProjectSynth
 */

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'bun',
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
