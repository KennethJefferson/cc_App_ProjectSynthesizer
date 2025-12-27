/**
 * TUI Launcher
 *
 * CRITICAL: This file must import @opentui/solid/preload before any TSX files.
 * This registers the SolidJS JSX transform.
 */

import type { CLIOptions } from './types.js';

/**
 * Initialize TUI and return a start function.
 * The start function begins rendering but doesn't block.
 */
export async function initTUI(options: CLIOptions): Promise<() => void> {
  // CRITICAL: Preload must be imported first before any TSX
  await import('@opentui/solid/preload');

  // Now we can safely import the TUI app
  const { startTUI } = await import('./app.js');

  // Return a function that starts the TUI
  return () => {
    startTUI(options);
  };
}

/**
 * @deprecated Use initTUI instead
 */
export async function launchTUI(options: CLIOptions): Promise<void> {
  const start = await initTUI(options);
  start();
}
