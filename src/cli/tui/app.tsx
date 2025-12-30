/** @jsxImportSource @opentui/solid */
/**
 * TUI Root Component - Main application entry
 */

import { render } from '@opentui/solid';
import { ThemeProvider } from './context/theme.js';
import { AppStateProvider } from './context/app-state.js';
import { MainRoute } from './routes/main.js';
import type { TUILaunchParams } from './launcher.js';

function App(props: TUILaunchParams) {
  return (
    <ThemeProvider>
      <AppStateProvider
        eventEmitter={props.eventEmitter}
        shutdownController={props.shutdownController}
        inputDir={props.options.inputDir}
        concurrency={props.options.concurrency}
      >
        <MainRoute />
      </AppStateProvider>
    </ThemeProvider>
  );
}

export async function startTUI(params: TUILaunchParams): Promise<void> {
  // Clear terminal and hide cursor
  process.stdout.write('\x1b[2J\x1b[H\x1b[?25l');

  // Cleanup function
  const cleanup = () => {
    process.stdout.write('\x1b[?25h\x1b[0m'); // Show cursor, reset colors
  };

  // Handle process exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    // Let the shutdown controller handle the actual shutdown
  });

  // Start rendering - render returns Promise<void>
  const renderPromise = render(() => <App {...params} />, {
    targetFps: 30,
    useMouse: false,
    exitOnCtrlC: false,
  });

  // Return a promise that resolves when the app is done
  return new Promise((resolve) => {
    // Listen for shutdown complete
    const unsubscribe = params.eventEmitter.on((event) => {
      if (event.type === 'shutdown:complete' || event.type === 'pool:complete') {
        // Give a moment for final render
        setTimeout(() => {
          cleanup();
          unsubscribe();
          resolve();
        }, 500);
      }
    });
  });
}
