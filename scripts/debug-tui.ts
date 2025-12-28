#!/usr/bin/env bun
/**
 * Debug TUI - Test TUI initialization and rendering separately
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { createEventEmitter } from '../src/worker/events';
import { setupShutdownHandler } from '../src/worker/shutdown';

const inputDir = process.argv[2] || 'N:\\__00. Cleaned\\Web\\__Next.Js\\__withoutProjects';
const recursive = true;
const concurrency = 1;
const scanWorkers = 1;

function log(msg: string) {
  const now = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${now}] ${msg}`);
}

async function main() {
  const resolvedInput = resolve(inputDir);

  log('=== TUI Debug Script ===');
  log(`Input: ${resolvedInput}`);
  log(`Recursive: ${recursive}`);
  log(`Concurrency: ${concurrency}`);

  if (!existsSync(resolvedInput)) {
    log(`ERROR: Input directory does not exist`);
    process.exit(1);
  }

  // Setup event emitter
  const eventEmitter = createEventEmitter();

  // Setup shutdown handler
  const shutdownController = setupShutdownHandler();
  if ('setEventEmitter' in shutdownController) {
    (shutdownController as any).setEventEmitter(eventEmitter);
  }

  // Log all events
  eventEmitter.on((event) => {
    log(`EVENT: ${event.type}`);
  });

  const options = {
    inputDir: resolvedInput,
    recursive,
    concurrency,
    scanWorkers,
    shutdownController,
    eventEmitter,
  };

  log('--- Step 1: Loading preload ---');
  try {
    await import('@opentui/solid/preload');
    log('Preload loaded successfully');
  } catch (error) {
    log(`ERROR loading preload: ${error}`);
    console.error(error);
    process.exit(1);
  }

  log('--- Step 2: Loading TUI app module ---');
  try {
    const appModule = await import('../src/cli/tui/app.js');
    log(`App module loaded: ${Object.keys(appModule).join(', ')}`);
  } catch (error) {
    log(`ERROR loading app module: ${error}`);
    console.error(error);
    process.exit(1);
  }

  log('--- Step 3: Starting TUI render ---');
  try {
    const { startTUI } = await import('../src/cli/tui/app.js');

    // Add error handler for uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('\n[UNCAUGHT EXCEPTION]');
      console.error(error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('\n[UNHANDLED REJECTION]');
      console.error(reason);
    });

    log('Calling startTUI...');
    startTUI(options);
    log('startTUI called (TUI should be rendering)');
  } catch (error) {
    log(`ERROR starting TUI: ${error}`);
    console.error(error);
    process.exit(1);
  }

  log('--- Step 4: Emitting test events ---');

  // Wait a moment for TUI to initialize
  await new Promise(r => setTimeout(r, 500));

  // Emit scan start
  log('Emitting scan:start');
  eventEmitter.emit({ type: 'scan:start' });

  await new Promise(r => setTimeout(r, 500));

  // Emit scan complete with test data
  log('Emitting scan:complete');
  eventEmitter.emit({
    type: 'scan:complete',
    total: 1,
    skipped: 0,
  });

  await new Promise(r => setTimeout(r, 500));

  log('Emitting pool:start');
  eventEmitter.emit({
    type: 'pool:start',
    workerCount: 1,
  });

  log('--- TUI Debug: Running ---');
  log('Press Ctrl+C to exit');

  // Keep running
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
