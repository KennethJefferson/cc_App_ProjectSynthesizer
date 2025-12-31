/**
 * Graceful shutdown handling
 *
 * Note: Signal handlers (SIGINT/SIGTERM) are set up in app.tsx
 * to avoid duplicate handlers. This module provides the controller
 * interface that tracks shutdown state.
 */

import type { ShutdownController } from '../types';
import type { SynthEventEmitter } from './events';

/**
 * Extended shutdown controller with event emitter support
 */
export interface ShutdownControllerWithEvents extends ShutdownController {
  setEventEmitter: (emitter: SynthEventEmitter) => void;
}

/**
 * Create shutdown controller (signal handlers are set up in TUI app.tsx)
 */
export function setupShutdownHandler(): ShutdownControllerWithEvents {
  let eventEmitter: SynthEventEmitter | null = null;

  const controller: ShutdownControllerWithEvents = {
    isShuttingDown: false,
    forceExit: false,
    setEventEmitter: (emitter: SynthEventEmitter) => {
      eventEmitter = emitter;
    },
  };

  // Note: Signal handlers are registered in app.tsx to ensure single handler
  // and proper integration with TUI state

  return controller;
}

/**
 * Check if we should continue processing
 */
export function shouldContinueProcessing(controller: ShutdownController): boolean {
  return !controller.isShuttingDown;
}
