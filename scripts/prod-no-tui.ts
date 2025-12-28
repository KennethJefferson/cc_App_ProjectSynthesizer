#!/usr/bin/env bun
/**
 * Production runner without TUI - runs full orchestration with console output
 * This is for testing when TUI has issues with terminal handling
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { scanForCoursesParallel } from '../src/scanner';
import { runWorkerPool, createEventEmitter } from '../src/worker';
import { setupShutdownHandler } from '../src/worker/shutdown';
import type { SynthEvent } from '../src/worker/events';

// Parse command line or use defaults
const inputDir = process.argv[2] || 'N:\\__00. Cleaned\\Web\\__Next.Js\\__withoutProjects';
const recursive = process.argv.includes('-r') || process.argv.includes('--recursive') || true;
const concurrency = parseInt(process.argv.find(a => a.startsWith('-c='))?.split('=')[1] || '5') || 5;
const scanWorkers = parseInt(process.argv.find(a => a.startsWith('-s='))?.split('=')[1] || '3') || 3;

function log(msg: string) {
  const now = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${now}] ${msg}`);
}

async function main() {
  const resolvedInput = resolve(inputDir);

  log('=== CCProjectSynth (No-TUI Mode) ===');
  log(`Input: ${resolvedInput}`);
  log(`Recursive: ${recursive}`);
  log(`Concurrency: ${concurrency}`);
  log(`Scan Workers: ${scanWorkers}`);

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

  // Track state
  let startTime = Date.now();
  let workersActive = 0;
  const workerStates: Map<number, { course: string; phase: string; projects: number }> = new Map();

  // Log events with meaningful output
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
        workersActive++;
        const courseName = event.course.path.split(/[\\/]/).pop() || event.course.path;
        workerStates.set(event.workerId, { course: courseName, phase: 'discovery', projects: 0 });
        log(`WORKER ${event.workerId}: [${workersActive} active] Starting: ${courseName}`);
        break;
      case 'worker:discovery:complete':
        const state = workerStates.get(event.workerId);
        if (state) {
          state.phase = 'generation';
          state.projects = event.projectCount;
        }
        log(`WORKER ${event.workerId}: Discovery found ${event.projectCount} projects`);
        break;
      case 'worker:generation:progress':
        log(`WORKER ${event.workerId}: Generating ${event.current}/${event.total} - ${event.projectName}`);
        break;
      case 'worker:complete':
        workersActive--;
        const ws = workerStates.get(event.workerId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`WORKER ${event.workerId}: [${workersActive} active] Complete - ${event.result.status} (${event.result.projectsGenerated.length} projects) [${elapsed}s]`);
        workerStates.delete(event.workerId);
        break;
      case 'worker:error':
        workersActive--;
        log(`WORKER ${event.workerId}: ERROR - ${event.error}`);
        workerStates.delete(event.workerId);
        break;
      case 'stats:update':
        log(`STATS: total=${event.stats.total} completed=${event.stats.completed} failed=${event.stats.failed} remaining=${event.stats.remaining}`);
        break;
      case 'pool:complete':
        log(`POOL: Complete - ${event.stats.completed}/${event.stats.total} successful`);
        break;
      case 'shutdown:signal':
        log(`SHUTDOWN: Signal received (count: ${event.count})`);
        break;
    }
  });

  try {
    // Phase 1: Scan
    log('--- PHASE 1: Scanning ---');
    const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);

    const pendingCourses = courses.filter(c => c.state === 'pending');
    const skippedCourses = courses.filter(c => c.state === 'skipped');

    log(`Found ${courses.length} courses (${pendingCourses.length} pending, ${skippedCourses.length} skipped)`);

    for (const c of courses.slice(0, 10)) {
      log(`  - ${c.name} [${c.state}] (${c.srtFiles.length} SRTs)`);
    }
    if (courses.length > 10) {
      log(`  ... and ${courses.length - 10} more`);
    }

    if (pendingCourses.length === 0) {
      log('No pending courses to process');
      process.exit(0);
    }

    // Phase 2: Process
    log('--- PHASE 2: Processing ---');
    startTime = Date.now();

    await runWorkerPool(courses, {
      concurrency,
      shutdownController,
      inputDir: resolvedInput,
      eventEmitter,
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`All processing complete in ${totalTime}s!`);
    process.exit(0);
  } catch (error) {
    log(`FATAL ERROR: ${error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
