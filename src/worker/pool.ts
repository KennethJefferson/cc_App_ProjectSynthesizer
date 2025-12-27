/**
 * Worker pool management
 */

import type { Course, CourseResult, WorkerPoolOptions, PoolStats } from '../types';
import { processCourse } from './worker';
import { shouldContinueProcessing } from './shutdown';
import type { SynthEventEmitter } from './events';

/**
 * Run worker pool to process courses
 */
export async function runWorkerPool(
  courses: Course[],
  options: WorkerPoolOptions
): Promise<CourseResult[]> {
  const { concurrency, shutdownController, inputDir, eventEmitter } = options;

  // Filter out skipped courses
  const pendingCourses = courses.filter((c) => c.state === 'pending');
  const skippedCount = courses.filter((c) => c.state === 'skipped').length;

  if (pendingCourses.length === 0) {
    return [];
  }

  // Emit pool start
  eventEmitter?.emit({ type: 'pool:start', workerCount: concurrency });

  const queue = [...pendingCourses];
  const results: CourseResult[] = [];
  const activeWorkers = new Map<number, string>(); // workerId -> coursePath

  // Track statistics
  const stats: PoolStats = {
    total: pendingCourses.length + skippedCount,
    completed: 0,
    failed: 0,
    skipped: skippedCount,
    remaining: pendingCourses.length,
  };

  // Emit initial stats
  eventEmitter?.emit({ type: 'stats:update', stats: { ...stats } });

  // Create worker promises
  const workers: Promise<void>[] = [];

  for (let workerId = 0; workerId < concurrency; workerId++) {
    workers.push(
      (async () => {
        while (true) {
          // Check if we should continue
          if (!shouldContinueProcessing(shutdownController)) {
            if (activeWorkers.has(workerId)) {
              // Completing current course
            } else {
              eventEmitter?.emit({ type: 'worker:idle', workerId });
              break;
            }
          }

          // Get next course from queue
          const course = queue.shift();
          if (!course) {
            eventEmitter?.emit({ type: 'worker:idle', workerId });
            break;
          }

          // Process course
          activeWorkers.set(workerId, course.path);
          eventEmitter?.emit({ type: 'worker:start', workerId, course });
          eventEmitter?.emit({ type: 'worker:discovery:start', workerId });

          try {
            const result = await processCourse(course, inputDir, workerId, eventEmitter);
            results.push(result);

            // Update stats
            if (result.status === 'complete' || result.status === 'no_projects') {
              stats.completed++;
            } else {
              stats.failed++;
            }

            stats.remaining = queue.length;

            // Emit events
            eventEmitter?.emit({ type: 'worker:complete', workerId, result });
            eventEmitter?.emit({ type: 'stats:update', stats: { ...stats } });
          } catch (error) {
            stats.failed++;
            stats.remaining = queue.length;
            const errorMsg = error instanceof Error ? error.message : String(error);

            eventEmitter?.emit({
              type: 'worker:error',
              workerId,
              error: errorMsg,
              coursePath: course.path,
            });
            eventEmitter?.emit({ type: 'stats:update', stats: { ...stats } });

            results.push({
              coursePath: course.path,
              status: 'failed',
              discovery: {
                has_projects: false,
                project_count: 0,
                skipped_srts: [],
                no_project_reason: null,
                manifest: null,
              },
              projectsGenerated: [],
              errors: [errorMsg],
              durationMs: 0,
            });
          }

          activeWorkers.delete(workerId);

          // If shutdown requested and we just finished, exit
          if (!shouldContinueProcessing(shutdownController)) {
            eventEmitter?.emit({ type: 'worker:idle', workerId });
            break;
          }
        }
      })()
    );
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  // Emit pool complete
  eventEmitter?.emit({ type: 'pool:complete', stats: { ...stats } });

  return results;
}
