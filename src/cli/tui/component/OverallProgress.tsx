/** @jsxImportSource @opentui/solid */

import { createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useSynth } from '../context/synth.js';
import { ProgressBar } from './ProgressBar.js';
import { StatusIcon } from './StatusIcon.js';

export function OverallProgress() {
  const theme = useTheme();
  const synth = useSynth();

  const stats = synth.stats;

  const progressCurrent = createMemo(() => stats().completed + stats().failed);

  return (
    <box
      flexDirection="column"
      width="100%"
      paddingLeft={1}
      paddingRight={1}
      gap={0}
    >
      {/* Section header */}
      <text style={{ fg: theme.colors.textDim }}>{'\u2500 Progress \u2500'}</text>

      {/* Progress bar */}
      <box paddingLeft={1}>
        <ProgressBar
          current={progressCurrent()}
          total={stats().total - stats().skipped}
          width={50}
        />
      </box>

      {/* Stats row */}
      <box flexDirection="row" gap={2} paddingLeft={1}>
        <box flexDirection="row" gap={1}>
          <StatusIcon status="complete" />
          <text style={{ fg: theme.colors.text }}>{stats().completed} completed</text>
        </box>
        <box flexDirection="row" gap={1}>
          <StatusIcon status="failed" />
          <text style={{ fg: theme.colors.text }}>{stats().failed} failed</text>
        </box>
        <box flexDirection="row" gap={1}>
          <StatusIcon status="skipped" />
          <text style={{ fg: theme.colors.text }}>{stats().skipped} skipped</text>
        </box>
        <box flexDirection="row" gap={1}>
          <StatusIcon status="pending" />
          <text style={{ fg: theme.colors.text }}>{stats().remaining} remaining</text>
        </box>
      </box>
    </box>
  );
}
