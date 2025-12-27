/** @jsxImportSource @opentui/solid */

import { createMemo, Show } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useSynth } from '../context/synth.js';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function MetricsPanel() {
  const theme = useTheme();
  const synth = useSynth();

  const avgTime = createMemo(() => {
    const avg = synth.avgCourseMs();
    if (avg === 0) return '--';
    return formatDuration(avg);
  });

  const successRate = createMemo(() => {
    const stats = synth.stats();
    const total = stats.completed + stats.failed;
    if (total === 0) return '--';
    return `${Math.round((stats.completed / total) * 100)}%`;
  });

  const eta = createMemo(() => {
    const avg = synth.avgCourseMs();
    const stats = synth.stats();
    const remaining = stats.remaining;
    const activeWorkers = synth.workers().filter((w) => w.status !== 'idle').length;

    if (avg === 0 || remaining === 0 || activeWorkers === 0) return '--';

    // Estimate based on parallel processing
    const estimatedMs = (remaining * avg) / activeWorkers;
    return formatDuration(estimatedMs);
  });

  const projectsPerCourse = createMemo(() => {
    const activity = synth.recentActivity();
    const successful = activity.filter((a) => a.success);
    if (successful.length === 0) return '--';
    const total = successful.reduce((sum, a) => sum + a.projectCount, 0);
    return (total / successful.length).toFixed(1);
  });

  return (
    <box
      flexDirection="column"
      width="100%"
      paddingLeft={1}
      paddingRight={1}
      gap={0}
    >
      {/* Section header */}
      <text style={{ fg: theme.colors.textDim }}>{'\u2500 Metrics \u2500'}</text>

      {/* Metrics row */}
      <box flexDirection="row" gap={2} paddingLeft={1}>
        <box flexDirection="row" gap={1}>
          <text style={{ fg: theme.colors.textDim }}>Avg:</text>
          <text style={{ fg: theme.colors.text }}>{avgTime()}/course</text>
        </box>

        <box flexDirection="row" gap={1}>
          <text style={{ fg: theme.colors.textDim }}>Projects:</text>
          <text style={{ fg: theme.colors.text }}>{projectsPerCourse()}/course</text>
        </box>

        <box flexDirection="row" gap={1}>
          <text style={{ fg: theme.colors.textDim }}>Success:</text>
          <text style={{ fg: theme.colors.text }}>{successRate()}</text>
        </box>

        <box flexDirection="row" gap={1}>
          <text style={{ fg: theme.colors.textDim }}>ETA:</text>
          <text style={{ fg: theme.colors.text }}>{eta()}</text>
        </box>
      </box>

      {/* Shutdown message */}
      <Show when={synth.phase() === 'shutdown'}>
        <box paddingLeft={1} paddingTop={1}>
          <text style={{ fg: theme.colors.warning }}>
            Shutting down... waiting for active workers to complete.
          </text>
        </box>
      </Show>
    </box>
  );
}
