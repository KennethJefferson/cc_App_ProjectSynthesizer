/** @jsxImportSource @opentui/solid */

import { For, createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useSynth } from '../context/synth.js';
import { WorkerRow } from './WorkerRow.js';

export function WorkerPanel() {
  const theme = useTheme();
  const synth = useSynth();

  const activeCount = createMemo(() => {
    return synth.workers().filter((w) => w.status !== 'idle').length;
  });

  const totalCount = createMemo(() => synth.workers().length);

  return (
    <box
      flexDirection="column"
      width="100%"
      paddingLeft={1}
      paddingRight={1}
      gap={0}
    >
      {/* Section header with active count */}
      <box flexDirection="row" gap={1}>
        <text style={{ fg: theme.colors.textDim }}>{'\u2500 Workers '}</text>
        <text style={{ fg: theme.colors.primary }}>
          ({activeCount()}/{totalCount()} active)
        </text>
        <text style={{ fg: theme.colors.textDim }}>{'\u2500'}</text>
      </box>

      {/* Worker rows */}
      <box flexDirection="column" paddingLeft={1} gap={0}>
        <For each={synth.workers()}>
          {(worker) => <WorkerRow worker={worker} />}
        </For>
      </box>
    </box>
  );
}
