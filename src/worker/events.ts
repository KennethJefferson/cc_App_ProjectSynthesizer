/**
 * Event System for TUI Updates
 *
 * Bridges worker pool activity to TUI reactivity via typed events.
 */

import type { Course, CourseResult, PoolStats } from '../types';

/**
 * All possible synth events
 */
export type SynthEvent =
  // Scanning phase
  | { type: 'scan:start' }
  | { type: 'scan:course-found'; course: Course }
  | { type: 'scan:complete'; total: number; skipped: number }
  // Pool lifecycle
  | { type: 'pool:start'; workerCount: number }
  | { type: 'pool:complete'; stats: PoolStats }
  // Worker events
  | { type: 'worker:start'; workerId: number; course: Course }
  | { type: 'worker:discovery:start'; workerId: number }
  | { type: 'worker:discovery:complete'; workerId: number; projectCount: number }
  | { type: 'worker:generation:start'; workerId: number; total: number }
  | { type: 'worker:generation:progress'; workerId: number; current: number; total: number; projectName: string }
  | { type: 'worker:complete'; workerId: number; result: CourseResult }
  | { type: 'worker:error'; workerId: number; error: string; coursePath: string }
  | { type: 'worker:idle'; workerId: number }
  // GitHub events
  | { type: 'worker:github:start'; workerId: number; projectName: string }
  | { type: 'worker:github:complete'; workerId: number; projectName: string; repoUrl: string }
  | { type: 'worker:github:skipped'; workerId: number; reason: string }
  | { type: 'worker:github:failed'; workerId: number; projectName: string; error: string }
  // Stats
  | { type: 'stats:update'; stats: PoolStats }
  // Shutdown
  | { type: 'shutdown:signal'; count: number }
  | { type: 'shutdown:complete' };

export type SynthEventType = SynthEvent['type'];

type EventListener = (event: SynthEvent) => void;

/**
 * Simple typed event emitter for synth events
 */
export class SynthEventEmitter {
  private listeners: Set<EventListener> = new Set();

  /**
   * Subscribe to all events
   */
  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: SynthEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Don't let listener errors break event flow
        console.error('Event listener error:', err);
      }
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Create a new event emitter instance
 */
export function createEventEmitter(): SynthEventEmitter {
  return new SynthEventEmitter();
}
