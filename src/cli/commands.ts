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
 * Main synthesizer command - with TUI
 */
export async function runSynthesizer(options: RunOptions): Promise<void> {
  const { inputDir, recursive, concurrency, scanWorkers, shutdownController } = options;

  // Resolve and validate input directory
  const resolvedInput = resolve(inputDir);

  if (!existsSync(resolvedInput)) {
    throw new Error(`Input directory does not exist: ${resolvedInput}`);
  }

  // Create event emitter for progress tracking
  const eventEmitter = createEventEmitter();

  // Connect shutdown controller to event emitter
  if ('setEventEmitter' in shutdownController) {
    (shutdownController as any).setEventEmitter(eventEmitter);
  }

  // Launch TUI - it will subscribe to events and display progress
  const { launchTUI } = await import('./tui/launcher.js');

  // Start TUI in parallel with processing
  const tuiPromise = launchTUI({
    options: {
      inputDir: resolvedInput,
      recursive,
      concurrency,
      scanWorkers,
    },
    eventEmitter,
    shutdownController,
  });

  // Phase 1: Scan for courses
  eventEmitter.emit({ type: 'scan:start' });

  const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);

  const pendingCourses = courses.filter((c) => c.state === 'pending');
  const skippedCourses = courses.filter((c) => c.state === 'skipped');

  // Emit each course found
  for (const course of courses) {
    eventEmitter.emit({ type: 'scan:course-found', course });
  }

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
    await tuiPromise;
    return;
  }

  // Phase 2: Process courses
  await runWorkerPool(courses, {
    concurrency,
    shutdownController,
    inputDir: resolvedInput,
    eventEmitter,
  });

  // Wait for TUI to finish
  await tuiPromise;
}
