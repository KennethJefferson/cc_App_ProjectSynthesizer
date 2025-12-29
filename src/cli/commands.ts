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
 * Main synthesizer command
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

  // Set up console logging for events
  setupConsoleLogging(eventEmitter);

  // Phase 1: Scan for courses
  console.log('\n📂 Scanning for courses...\n');
  eventEmitter.emit({ type: 'scan:start' });

  const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);

  const pendingCourses = courses.filter((c) => c.state === 'pending');
  const skippedCourses = courses.filter((c) => c.state === 'skipped');

  eventEmitter.emit({
    type: 'scan:complete',
    total: courses.length,
    skipped: skippedCourses.length,
  });

  console.log(`Found ${courses.length} course(s): ${pendingCourses.length} to process, ${skippedCourses.length} skipped\n`);

  if (courses.length === 0 || pendingCourses.length === 0) {
    console.log('No courses to process.');
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
  console.log('🚀 Starting project synthesis...\n');

  await runWorkerPool(courses, {
    concurrency,
    shutdownController,
    inputDir: resolvedInput,
    eventEmitter,
  });

  console.log('\n✅ All processing complete.');
}

/**
 * Set up console logging for synth events
 */
function setupConsoleLogging(eventEmitter: ReturnType<typeof createEventEmitter>): void {
  eventEmitter.on((event) => {
    switch (event.type) {
      case 'worker:start':
        console.log(`[W${event.workerId}] Starting: ${event.course.name}`);
        break;

      case 'worker:discovery:complete':
        console.log(`[W${event.workerId}] Discovery complete: ${event.projectCount} project(s) found`);
        break;

      case 'worker:generation:progress':
        console.log(`[W${event.workerId}] Generated: ${event.projectName} (${event.current}/${event.total})`);
        break;

      case 'worker:github:complete':
        console.log(`[W${event.workerId}] Pushed to GitHub: ${event.repoUrl}`);
        break;

      case 'worker:github:skipped':
        console.log(`\x1b[33m[GitHub] ${event.reason} - skipping repo creation.\x1b[0m`);
        break;

      case 'worker:github:failed':
        console.log(`\x1b[31m[W${event.workerId}] GitHub push failed for ${event.projectName}: ${event.error}\x1b[0m`);
        break;

      case 'worker:complete':
        const { result } = event;
        const status = result.status === 'complete' ? '✓' : result.status === 'failed' ? '✗' : '○';
        console.log(`[W${event.workerId}] ${status} Completed: ${result.projectsGenerated.length} project(s)`);
        break;

      case 'worker:error':
        console.log(`\x1b[31m[W${event.workerId}] Error: ${event.error}\x1b[0m`);
        break;

      case 'pool:complete':
        const { stats } = event;
        console.log(`\n📊 Summary: ${stats.completed} completed, ${stats.failed} failed, ${stats.skipped} skipped`);
        break;

      case 'shutdown:signal':
        if (event.count === 1) {
          console.log('\n⏳ Shutting down gracefully... (press Ctrl+C again to force)');
        } else {
          console.log('\n⚠️ Force shutting down...');
        }
        break;
    }
  });
}
