/** @jsxImportSource @opentui/solid */

import { createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useSynth } from '../context/synth.js';
import type { Phase } from '../types.js';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const phaseLabels: Record<Phase, string> = {
  scanning: 'Scanning',
  processing: 'Processing',
  complete: 'Complete',
  shutdown: 'Shutting Down',
};

export function Header() {
  const theme = useTheme();
  const synth = useSynth();

  const phaseLabel = createMemo(() => phaseLabels[synth.phase()]);
  const elapsed = createMemo(() => formatDuration(synth.elapsedMs()));

  const phaseColor = createMemo(() => {
    switch (synth.phase()) {
      case 'complete':
        return theme.colors.success;
      case 'shutdown':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  });

  return (
    <box
      flexDirection="row"
      width="100%"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
    >
      <text style={{ fg: theme.colors.primary }}>CCProjectSynth</text>
      <box flexDirection="row" gap={1}>
        <text style={{ fg: phaseColor() }}>{phaseLabel()}</text>
        <text style={{ fg: theme.colors.textDim }}>{'\u2022'}</text>
        <text style={{ fg: theme.colors.text }}>{elapsed()}</text>
      </box>
    </box>
  );
}
