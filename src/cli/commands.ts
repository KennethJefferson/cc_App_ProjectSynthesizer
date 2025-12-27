/**
 * CLI command handlers
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { scanForCoursesParallel } from '../scanner';
import { runWorkerPool, createEventEmitter } from '../worker';
import type { ShutdownController, CourseResult } from '../types';

export interface RunOptions {
  inputDir: string;
  recursive: boolean;
  concurrency: number;
  scanWorkers: number;
  shutdownController: ShutdownController;
}

/**
 * Main synthesizer command - launches TUI
 */
export async function runSynthesizer(options: RunOptions): Promise<void> {
  const { inputDir, recursive, concurrency, scanWorkers, shutdownController } = options;

  // Resolve and validate input directory
  const resolvedInput = resolve(inputDir);

  if (!existsSync(resolvedInput)) {
    throw new Error(`Input directory does not exist: ${resolvedInput}`);
  }

  // Create event emitter for TUI
  const eventEmitter = createEventEmitter();

  // Connect shutdown controller to event emitter
  if ('setEventEmitter' in shutdownController) {
    (shutdownController as any).setEventEmitter(eventEmitter);
  }

  // Initialize TUI (loads preload and app)
  const { initTUI } = await import('./tui/launcher.js');

  const startTUI = await initTUI({
    inputDir: resolvedInput,
    recursive,
    concurrency,
    scanWorkers,
    shutdownController,
    eventEmitter,
  });

  // Start TUI rendering (non-blocking)
  startTUI();

  // Phase 1: Scan for courses
  eventEmitter.emit({ type: 'scan:start' });

  const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);

  const pendingCourses = courses.filter((c) => c.state === 'pending');
  const skippedCourses = courses.filter((c) => c.state === 'skipped');

  eventEmitter.emit({
    type: 'scan:complete',
    total: courses.length,
    skipped: skippedCourses.length,
  });

  if (courses.length === 0 || pendingCourses.length === 0) {
    eventEmitter.emit({
      type: 'pool:complete',
      stats: {
        total: courses.length,
        completed: 0,
        failed: 0,
        skipped: skippedCourses.length,
        remaining: 0,
      },
    });
    return;
  }

  // Phase 2: Process courses
  await runWorkerPool(courses, {
    concurrency,
    shutdownController,
    inputDir: resolvedInput,
    eventEmitter,
  });

  // TUI will show completion state
  // Keep the app running so TUI stays visible
  // User can press Ctrl+C to exit
  await new Promise<void>(() => {
    // Never resolves - app stays open until process.exit()
  });
}
