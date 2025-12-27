/** @jsxImportSource @opentui/solid */

import { createMemo, Show } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { StatusIcon } from './StatusIcon.js';
import type { WorkerState } from '../types.js';

interface WorkerRowProps {
  worker: WorkerState;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function WorkerRow(props: WorkerRowProps) {
  const theme = useTheme();

  const statusLabel = createMemo(() => {
    switch (props.worker.status) {
      case 'idle':
        return 'Idle';
      case 'discovery':
        return 'Discovery';
      case 'generation':
        return 'Generation';
      case 'completing':
        return 'Completing';
    }
  });

  const elapsed = createMemo(() => {
    if (!props.worker.startTime) return '';
    return formatDuration(Date.now() - props.worker.startTime);
  });

  const generationProgress = createMemo(() => {
    if (props.worker.status !== 'generation' || props.worker.generationTotal === 0) {
      return '';
    }
    return `[${props.worker.generationCurrent}/${props.worker.generationTotal}]`;
  });

  const courseName = createMemo(() => {
    if (!props.worker.course) return '';
    // Truncate long course names
    const name = props.worker.course;
    return name.length > 30 ? name.slice(0, 27) + '...' : name;
  });

  return (
    <box flexDirection="row" width="100%" gap={1}>
      {/* Worker ID */}
      <text style={{ fg: theme.colors.textDim }}>W{props.worker.id}</text>

      {/* Status icon */}
      <StatusIcon status={props.worker.status} />

      {/* Status label (fixed width) */}
      <box width={11}>
        <text style={{ fg: theme.colors.text }}>{statusLabel().padEnd(10)}</text>
      </box>

      {/* Course name (flex) */}
      <box flexGrow={1}>
        <Show when={props.worker.course}>
          <text style={{ fg: theme.colors.text }}>{courseName()}</text>
        </Show>
      </box>

      {/* Generation progress */}
      <Show when={generationProgress()}>
        <text style={{ fg: theme.colors.primary }}>{generationProgress()}</text>
      </Show>

      {/* Elapsed time */}
      <Show when={elapsed()}>
        <text style={{ fg: theme.colors.textDim }}>{elapsed()}</text>
      </Show>
    </box>
  );
}
