/** @jsxImportSource @opentui/solid */

import { For, Show, createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';
import { useSynth } from '../context/synth.js';
import { StatusIcon } from './StatusIcon.js';
import type { ActivityEntry } from '../types.js';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function ActivityRow(props: { entry: ActivityEntry }) {
  const theme = useTheme();

  const courseName = createMemo(() => {
    const name = props.entry.course;
    return name.length > 25 ? name.slice(0, 22) + '...' : name;
  });

  return (
    <box flexDirection="row" width="100%" gap={1}>
      {/* Status icon */}
      <StatusIcon status={props.entry.success ? 'complete' : 'failed'} />

      {/* Course name */}
      <box width={26}>
        <text style={{ fg: theme.colors.text }}>{courseName()}</text>
      </box>

      {/* Project count or error */}
      <Show
        when={props.entry.success}
        fallback={
          <text style={{ fg: theme.colors.error }}>
            {props.entry.error?.slice(0, 35) || 'Error'}
          </text>
        }
      >
        <text style={{ fg: theme.colors.textDim }}>
          {props.entry.projectCount} project{props.entry.projectCount !== 1 ? 's' : ''}
        </text>
      </Show>

      {/* Duration */}
      <box flexGrow={1} />
      <text style={{ fg: theme.colors.textDim }}>
        {formatDuration(props.entry.durationMs)}
      </text>
    </box>
  );
}

export function RecentActivity() {
  const theme = useTheme();
  const synth = useSynth();

  return (
    <box
      flexDirection="column"
      width="100%"
      paddingLeft={1}
      paddingRight={1}
      gap={0}
    >
      {/* Section header */}
      <text style={{ fg: theme.colors.textDim }}>{'\u2500 Recent Activity \u2500'}</text>

      {/* Activity rows */}
      <box flexDirection="column" paddingLeft={1} gap={0}>
        <Show
          when={synth.recentActivity().length > 0}
          fallback={
            <text style={{ fg: theme.colors.textDim }}>No activity yet</text>
          }
        >
          <For each={synth.recentActivity()}>
            {(entry) => <ActivityRow entry={entry} />}
          </For>
        </Show>
      </box>
    </box>
  );
}
