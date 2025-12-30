/**
 * TUI Launcher - CRITICAL: Must import preload before any TSX files
 */

import type { SynthEventEmitter } from '../../worker/events';
import type { ShutdownController } from '../../types';

export interface TUIOptions {
  inputDir: string;
  recursive: boolean;
  concurrency: number;
  scanWorkers: number;
}

export interface TUILaunchParams {
  options: TUIOptions;
  eventEmitter: SynthEventEmitter;
  shutdownController: ShutdownController;
}

/**
 * Start the TUI - MUST be called as entry point
 * Handles SolidJS preload registration before importing TSX
 */
export async function launchTUI(params: TUILaunchParams): Promise<void> {
  // CRITICAL: Import preload BEFORE any TSX files
  await import('@opentui/solid/preload');

  // Now safe to import TSX modules
  const { startTUI } = await import('./app.js');
  await startTUI(params);
}
