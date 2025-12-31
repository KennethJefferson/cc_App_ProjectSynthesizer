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

// CRITICAL: Set up emergency signal handler FIRST, before anything else
// This ensures Ctrl+C works even if TUI fails to start or gets stuck
let emergencyCtrlCCount = 0;
let shutdownControllerRef: { isShuttingDown: boolean; forceExit: boolean } | null = null;

// Export function to link shutdown controller
export function linkShutdownController(controller: { isShuttingDown: boolean; forceExit: boolean }) {
  shutdownControllerRef = controller;
}

const emergencyHandler = () => {
  emergencyCtrlCCount++;

  // Also update the shutdown controller if linked
  if (shutdownControllerRef) {
    shutdownControllerRef.isShuttingDown = true;
    if (emergencyCtrlCCount >= 2) {
      shutdownControllerRef.forceExit = true;
    }
  }

  if (emergencyCtrlCCount >= 2) {
    // Force exit on double Ctrl+C
    process.stdout.write('\x1b[?25h\x1b[0m'); // Show cursor, reset colors
    console.log('\n\x1b[33mForce exit!\x1b[0m');
    process.exit(0);
  }
  console.log('\n\x1b[33mShutdown requested... (Ctrl+C again to force)\x1b[0m');
};
process.on('SIGINT', emergencyHandler);
// Also handle SIGTERM for completeness
process.on('SIGTERM', emergencyHandler);

// Debug: confirm handler is active (only in DEBUG mode)
if (process.env.DEBUG) {
  console.log('[DEBUG] Emergency Ctrl+C handler active');
}

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

  // Link to emergency handler so Ctrl+C updates the controller
  linkShutdownController(shutdownController);

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
