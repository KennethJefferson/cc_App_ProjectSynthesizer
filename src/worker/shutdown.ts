/**
 * Graceful shutdown handling
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
 * Setup signal handlers for graceful shutdown
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

  let ctrlCCount = 0;

  const handleSignal = (_signal: string) => {
    ctrlCCount++;

    if (ctrlCCount === 1) {
      controller.isShuttingDown = true;
      eventEmitter?.emit({ type: 'shutdown:signal', count: 1 });
    } else {
      controller.forceExit = true;
      eventEmitter?.emit({ type: 'shutdown:signal', count: 2 });
      // Give TUI a moment to show the message before exiting
      setTimeout(() => process.exit(1), 100);
    }
  };

  // Handle Ctrl+C (SIGINT)
  process.on('SIGINT', () => handleSignal('SIGINT'));

  // Handle kill signal (SIGTERM)
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  return controller;
}

/**
 * Check if we should continue processing
 */
export function shouldContinueProcessing(controller: ShutdownController): boolean {
  return !controller.isShuttingDown;
}
