/** @jsxImportSource @opentui/solid */
/**
 * Main Route - Primary TUI layout
 */

import { Show } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useAppState } from '../context/app-state.js';
import { Logo } from '../component/logo.js';
import { ProgressBar } from '../component/progress-bar.js';
import { StatsPanel } from '../component/stats-panel.js';
import { WorkerStatus } from '../component/worker-status.js';
import { LogPanel } from '../component/log-panel.js';

export function MainRoute() {
  const { theme } = useTheme();
  const appState = useAppState();
  const progress = () => appState.overallProgress();

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      {/* Header with logo */}
      <Logo />

      {/* Input directory */}
      <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1}>
        <text style={{ fg: theme.textMuted }}>Input:</text>
        <text style={{ fg: theme.text }}>{appState.inputDir}</text>
      </box>

      {/* Shutdown hint */}
      <box paddingLeft={1} paddingRight={1}>
        <Show
          when={!appState.shutdownRequested()}
          fallback={
            <text style={{ fg: theme.warning }}>Shutting down gracefully... (Ctrl+C again to force)</text>
          }
        >
          <text style={{ fg: theme.textDim }}>Press Ctrl+C to gracefully stop</text>
        </Show>
      </box>

      {/* Overall progress bar */}
      <box paddingLeft={1} paddingRight={1}>
        <ProgressBar
          current={progress().current}
          total={progress().total}
          width={50}
          label="Overall:"
        />
      </box>

      {/* Stats panel */}
      <StatsPanel />

      {/* Worker status */}
      <WorkerStatus />

      {/* Log panel - takes remaining space */}
      <box flexGrow={1}>
        <LogPanel maxLines={8} />
      </box>
    </box>
  );
}
