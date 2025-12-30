/** @jsxImportSource @opentui/solid */
/**
 * Worker Status Component - Shows each worker's current state
 */

import { For, createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useAppState, type WorkerState } from '../context/app-state.js';

function formatWorkerLine(worker: WorkerState, icons: { pending: string; discovery: string; generation: string; running: string; completed: string; failed: string }): { icon: string; text: string } {
  const truncate = (str: string | null, len: number) => {
    if (!str) return '';
    return str.length > len ? str.slice(0, len - 3) + '...' : str;
  };

  let icon = icons.pending;
  let phaseText = 'idle';
  let details = '';

  switch (worker.phase) {
    case 'idle':
      icon = icons.pending;
      phaseText = 'idle';
      break;
    case 'discovery':
      icon = icons.discovery;
      phaseText = 'discovering';
      details = worker.courseName ? truncate(worker.courseName, 40) : '';
      break;
    case 'generation':
      icon = icons.generation;
      phaseText = 'generating';
      const progress = worker.projectsTotal > 0 ? ` (${worker.projectsCurrent}/${worker.projectsTotal})` : '';
      const project = worker.currentProject ? ` ${truncate(worker.currentProject, 25)}` : '';
      details = `${truncate(worker.courseName, 30)}${progress}${project}`;
      break;
    case 'github':
      icon = icons.running;
      phaseText = 'pushing';
      details = worker.currentProject ? truncate(worker.currentProject, 40) : '';
      break;
    case 'complete':
      icon = icons.completed;
      phaseText = 'done';
      break;
    case 'error':
      icon = icons.failed;
      phaseText = 'error';
      details = worker.error ? truncate(worker.error, 40) : '';
      break;
  }

  const line = `[W${worker.id}] ${icon} ${phaseText.padEnd(11)} ${details}`;
  return { icon, text: line };
}

export function WorkerStatus() {
  const { theme, icons } = useTheme();
  const appState = useAppState();

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text style={{ fg: theme.textMuted }}>Workers:</text>
      <For each={appState.workers()}>
        {(worker) => {
          const line = createMemo(() => formatWorkerLine(worker, icons));
          const color = createMemo(() => {
            switch (worker.phase) {
              case 'idle': return theme.textDim;
              case 'discovery': return theme.info;
              case 'generation': return theme.primary;
              case 'github': return theme.secondary;
              case 'complete': return theme.success;
              case 'error': return theme.error;
              default: return theme.textDim;
            }
          });
          return (
            <text style={{ fg: color() }}>{line().text}</text>
          );
        }}
      </For>
    </box>
  );
}
