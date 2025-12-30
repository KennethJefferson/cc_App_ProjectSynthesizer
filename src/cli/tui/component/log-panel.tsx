/** @jsxImportSource @opentui/solid */
/**
 * Log Panel Component - Scrollable log output
 */

import { For, createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useAppState, type LogEntry } from '../context/app-state.js';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatLogLine(entry: LogEntry, icons: { completed: string; failed: string; cancelled: string }): string {
  let icon = '\u2022';
  switch (entry.type) {
    case 'success': icon = icons.completed; break;
    case 'error': icon = icons.failed; break;
    case 'warning': icon = icons.cancelled; break;
  }

  const worker = entry.workerId !== undefined ? `[W${entry.workerId}] ` : '';
  return `${formatTime(entry.timestamp)} ${worker}${icon} ${entry.message}`;
}

export interface LogPanelProps {
  maxLines?: number;
}

export function LogPanel(props: LogPanelProps) {
  const { theme, icons } = useTheme();
  const appState = useAppState();
  const maxLines = props.maxLines ?? 8;

  const visibleLogs = createMemo(() => {
    const logs = appState.logs();
    return logs.slice(-maxLines);
  });

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return theme.success;
      case 'error': return theme.error;
      case 'warning': return theme.warning;
      default: return theme.textMuted;
    }
  };

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text style={{ fg: theme.textMuted }}>Activity Log:</text>
      <For each={visibleLogs()}>
        {(entry) => (
          <text style={{ fg: getLogColor(entry.type) }}>{formatLogLine(entry, icons)}</text>
        )}
      </For>
    </box>
  );
}
