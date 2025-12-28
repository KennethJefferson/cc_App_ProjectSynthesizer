#!/usr/bin/env bun
/**
 * Debug runner - bypasses TUI to see console output
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { scanForCoursesParallel } from '../src/scanner';
import { runWorkerPool, createEventEmitter } from '../src/worker';
import { setupShutdownHandler } from '../src/worker/shutdown';
import type { SynthEvent } from '../src/worker/events';

const inputDir = process.argv[2] || 'N:\\__00. Cleaned\\Web\\__Next.Js\\__withoutProjects';
const recursive = true;
const concurrency = 1;
const scanWorkers = 1;

let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 1800_000; // 30 minutes - no timeout during generation

function log(msg: string) {
  const now = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${now}] ${msg}`);
  lastActivityTime = Date.now();
}

async function main() {
  const resolvedInput = resolve(inputDir);
  log(`Starting debug run...`);
  log(`Input: ${resolvedInput}`);
  log(`Recursive: ${recursive}`);
  log(`Concurrency: ${concurrency}`);

  if (!existsSync(resolvedInput)) {
    log(`ERROR: Input directory does not exist`);
    process.exit(1);
  }

  // Setup inactivity checker
  const inactivityChecker = setInterval(() => {
    const inactive = Date.now() - lastActivityTime;
    if (inactive > INACTIVITY_TIMEOUT) {
      log(`TIMEOUT: No activity for ${Math.round(inactive/1000)}s - forcing exit`);
      process.exit(1);
    }
  }, 10_000);

  // Setup event emitter
  const eventEmitter = createEventEmitter();

  // Log all events
  eventEmitter.on((event: SynthEvent) => {
    switch (event.type) {
      case 'scan:start':
        log('SCAN: Starting...');
        break;
      case 'scan:complete':
        log(`SCAN: Complete - ${event.total} total, ${event.skipped} skipped`);
        break;
      case 'pool:start':
        log(`POOL: Starting with ${event.workerCount} workers`);
        break;
      case 'worker:start':
        log(`WORKER ${event.workerId}: Starting course: ${event.course.name}`);
        break;
      case 'worker:discovery:start':
        log(`WORKER ${event.workerId}: Discovery starting...`);
        break;
      case 'worker:discovery:complete':
        log(`WORKER ${event.workerId}: Discovery complete - ${event.projectCount} projects found`);
        break;
      case 'worker:generation:start':
        log(`WORKER ${event.workerId}: Generation starting (${event.total} projects)`);
        break;
      case 'worker:generation:progress':
        log(`WORKER ${event.workerId}: Generation progress ${event.current}/${event.total} - ${event.projectName}`);
        break;
      case 'worker:complete':
        log(`WORKER ${event.workerId}: Complete - status: ${event.result.status}`);
        break;
      case 'worker:error':
        log(`WORKER ${event.workerId}: ERROR - ${event.error}`);
        break;
      case 'worker:idle':
        log(`WORKER ${event.workerId}: Now idle`);
        break;
      case 'stats:update':
        log(`STATS: total=${event.stats.total} completed=${event.stats.completed} failed=${event.stats.failed} remaining=${event.stats.remaining}`);
        break;
      case 'pool:complete':
        log(`POOL: Complete`);
        break;
      case 'shutdown:signal':
        log(`SHUTDOWN: Signal received (count: ${event.count})`);
        break;
      default:
        log(`EVENT: ${event.type}`);
    }
  });

  // Setup shutdown handler
  const shutdownController = setupShutdownHandler();
  if ('setEventEmitter' in shutdownController) {
    (shutdownController as any).setEventEmitter(eventEmitter);
  }

  try {
    // Phase 1: Scan
    log('--- PHASE 1: Scanning ---');
    eventEmitter.emit({ type: 'scan:start' });

    const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);

    const pendingCourses = courses.filter(c => c.state === 'pending');
    const skippedCourses = courses.filter(c => c.state === 'skipped');

    log(`Found ${courses.length} courses (${pendingCourses.length} pending, ${skippedCourses.length} skipped)`);

    for (const c of courses) {
      log(`  - ${c.name} [${c.state}] (${c.srtFiles.length} SRTs)`);
    }

    eventEmitter.emit({
      type: 'scan:complete',
      total: courses.length,
      skipped: skippedCourses.length,
    });

    if (pendingCourses.length === 0) {
      log('No pending courses to process');
      clearInterval(inactivityChecker);
      process.exit(0);
    }

    // Phase 2: Process
    log('--- PHASE 2: Processing ---');

    await runWorkerPool(courses, {
      concurrency,
      shutdownController,
      inputDir: resolvedInput,
      eventEmitter,
    });

    log('All processing complete!');
    clearInterval(inactivityChecker);
    process.exit(0);
  } catch (error) {
    log(`FATAL ERROR: ${error}`);
    clearInterval(inactivityChecker);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
