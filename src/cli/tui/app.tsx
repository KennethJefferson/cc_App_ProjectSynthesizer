/** @jsxImportSource @opentui/solid */
/**
 * TUI Root Component - Main application entry
 */

import { render } from '@opentui/solid';
import { onMount, onCleanup } from 'solid-js';
import { ThemeProvider } from './context/theme.js';
import { AppStateProvider, useAppState } from './context/app-state.js';
import { MainRoute } from './routes/main.js';
import type { TUILaunchParams } from './launcher.js';

// Global shutdown handler reference (like ffmpeg-processor pattern)
let globalShutdownHandler: (() => void) | null = null;

export function setShutdownHandler(handler: () => void) {
  globalShutdownHandler = handler;
}

export function triggerShutdown() {
  if (globalShutdownHandler) {
    globalShutdownHandler();
  }
}

/**
 * Inner app component that has access to app state
 */
function AppInner() {
  const state = useAppState();

  // Register shutdown handler on mount
  onMount(() => {
    setShutdownHandler(() => {
      state.requestShutdown();
    });
  });

  onCleanup(() => {
    globalShutdownHandler = null;
  });

  return <MainRoute />;
}

function App(props: TUILaunchParams) {
  return (
    <ThemeProvider>
      <AppStateProvider
        eventEmitter={props.eventEmitter}
        shutdownController={props.shutdownController}
        inputDir={props.options.inputDir}
        concurrency={props.options.concurrency}
      >
        <AppInner />
      </AppStateProvider>
    </ThemeProvider>
  );
}

export async function startTUI(params: TUILaunchParams): Promise<void> {
  // Clear terminal and hide cursor
  process.stdout.write('\x1b[2J\x1b[H\x1b[?25l');

  // Cleanup function
  const cleanup = () => {
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.stdout.write('\x1b[0m');   // Reset colors
  };

  // Set up Ctrl+C handler (single handler like ffmpeg-processor)
  const handleSigint = () => {
    if (globalShutdownHandler) {
      globalShutdownHandler();
    } else {
      // If no handler registered yet, just exit
      cleanup();
      process.exit(0);
    }
  };

  process.on('SIGINT', handleSigint);

  // Start rendering
  // Note: useKittyKeyboard allows proper keyboard handling
  // exitOnCtrlC is NOT set (default behavior) to let our handler work
  const instance = render(() => <App {...params} />, {
    fps: 30,
    useMouse: false,
    useKittyKeyboard: true,
  });

  // Return a promise that resolves when the app is done
  return new Promise((resolve) => {
    // Listen for shutdown complete or pool complete
    const unsubscribe = params.eventEmitter.on((event) => {
      if (event.type === 'shutdown:complete' || event.type === 'pool:complete') {
        // Give a moment for final render
        setTimeout(() => {
          cleanup();
          process.off('SIGINT', handleSigint);
          unsubscribe();
          resolve();
        }, 500);
      }
    });
  });
}
