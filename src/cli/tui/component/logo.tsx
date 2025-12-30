/** @jsxImportSource @opentui/solid */
/**
 * Logo Component - ASCII banner art with subtitle
 */

import { For } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { useTheme } from '../context/theme.js';

// ASCII art banner for CCProjectSynth
const BANNER_LINES = [
  '  ██████╗ ██████╗██████╗ ██████╗  ██████╗      ██╗███████╗ ██████╗████████╗',
  ' ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔═══██╗     ██║██╔════╝██╔════╝╚══██╔══╝',
  ' ██║     ██║     ██████╔╝██████╔╝██║   ██║     ██║█████╗  ██║        ██║   ',
  ' ██║     ██║     ██╔═══╝ ██╔══██╗██║   ██║██   ██║██╔══╝  ██║        ██║   ',
  ' ╚██████╗╚██████╗██║     ██║  ██║╚██████╔╝╚█████╔╝███████╗╚██████╗   ██║   ',
  '  ╚═════╝ ╚═════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝   ╚═╝   ',
  '                   ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗            ',
  '                   ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║            ',
  '                   ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║            ',
  '                   ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║            ',
  '                   ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║            ',
  '                   ╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝            ',
];

const SUBTITLE = '>>> Synthesize Projects from Course Transcripts >>>';

export interface LogoProps {
  compact?: boolean;
}

export function Logo(props: LogoProps) {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" alignItems="center">
      <For each={BANNER_LINES}>
        {(line) => (
          <text style={{ fg: theme.primary }} attributes={TextAttributes.BOLD}>
            {line}
          </text>
        )}
      </For>
      <text style={{ fg: theme.secondary }}>{SUBTITLE}</text>
    </box>
  );
}
