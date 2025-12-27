#!/usr/bin/env bun

/**
 * CCProjectSynth - Main entry point
 *
 * Synthesize working code projects from course transcript files (.srt)
 * using Claude Code agents.
 */

import { parseArgs, printHelp, printVersion } from './cli/args';
import { runSynthesizer } from './cli/commands';
import { setupShutdownHandler } from './worker/shutdown';

async function main(): Promise<void> {
  // Parse command line arguments
  const args = parseArgs(process.argv.slice(2));

  // Handle help and version flags
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    printVersion();
    process.exit(0);
  }

  // Validate required arguments
  if (!args.input) {
    console.error('Error: Input directory (-i) is required.');
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  // Setup graceful shutdown handler
  const shutdownController = setupShutdownHandler();

  try {
    // Run the synthesizer
    await runSynthesizer({
      inputDir: args.input,
      recursive: args.recursive,
      concurrency: args.concurrency,
      scanWorkers: args.scanWorkers,
      shutdownController,
    });

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${errorMsg}`);

    if (process.env.DEBUG) {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
