/**
 * Worker-related type definitions
 */

import type { SynthEventEmitter } from '../worker/events.js';

export type WorkerState =
  | 'idle'          // Ready for new task
  | 'processing'    // Working on a course
  | 'completing';   // Finishing current task (shutdown mode)

export interface WorkerContext {
  id: number;
  state: WorkerState;
  currentCoursePath: string | null;
}

export interface WorkerPoolOptions {
  concurrency: number;
  shutdownController: ShutdownController;
  inputDir: string;
  eventEmitter?: SynthEventEmitter;
}

export interface ShutdownController {
  isShuttingDown: boolean;
  forceExit: boolean;
}

export interface PoolStats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  remaining: number;
}
