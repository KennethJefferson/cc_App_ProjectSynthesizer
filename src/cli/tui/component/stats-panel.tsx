/** @jsxImportSource @opentui/solid */
/**
 * Stats Panel Component - Overall statistics display
 */

import { createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useAppState } from '../context/app-state.js';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function StatsPanel() {
  const { theme } = useTheme();
  const appState = useAppState();

  const phaseLabel = createMemo(() => {
    const p = appState.phase();
    switch (p) {
      case 'idle': return 'Ready';
      case 'scanning': return 'Scanning';
      case 'processing': return 'Processing';
      case 'complete': return 'Complete';
      case 'shutdown': return 'Shutting Down';
      default: return p;
    }
  });

  const phaseColor = createMemo(() => {
    const p = appState.phase();
    switch (p) {
      case 'scanning': return theme.info;
      case 'processing': return theme.primary;
      case 'complete': return theme.success;
      case 'shutdown': return theme.warning;
      default: return theme.textMuted;
    }
  });

  const s = () => appState.stats();
  const progress = () => appState.overallProgress();

  // Build stats line as a single string
  const statsLine1 = createMemo(() => {
    return `Status: ${phaseLabel()} | Progress: ${progress().current}/${progress().total} (${progress().percent}%)`;
  });

  const statsLine2 = createMemo(() => {
    return `Completed: ${s().completed} | Failed: ${s().failed} | Skipped: ${s().skipped} | Elapsed: ${formatDuration(appState.elapsedTime())}`;
  });

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text style={{ fg: theme.text }}>{statsLine1()}</text>
      <text style={{ fg: theme.text }}>{statsLine2()}</text>
    </box>
  );
}
