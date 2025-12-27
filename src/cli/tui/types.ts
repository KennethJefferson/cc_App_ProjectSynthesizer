/**
 * TUI Type Definitions
 */

import type { ShutdownController } from '../../types/worker.js';
import type { SynthEventEmitter } from '../../worker/events.js';

export interface CLIOptions {
  inputDir: string;
  recursive: boolean;
  concurrency: number;
  scanWorkers: number;
  shutdownController: ShutdownController;
  eventEmitter: SynthEventEmitter;
}

export type Phase = 'scanning' | 'processing' | 'complete' | 'shutdown';

export type WorkerStatus = 'idle' | 'discovery' | 'generation' | 'completing';

export interface WorkerState {
  id: number;
  status: WorkerStatus;
  course?: string;
  coursePath?: string;
  discoveryComplete: boolean;
  projectsFound: number;
  generationCurrent: number;
  generationTotal: number;
  startTime?: number;
}

export interface ActivityEntry {
  course: string;
  success: boolean;
  projectCount: number;
  durationMs: number;
  timestamp: number;
  error?: string;
}

export interface Stats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  remaining: number;
}
