/** @jsxImportSource @opentui/solid */
/**
 * Progress Bar Component - Unicode block-based progress indicator
 */

import { createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';

export interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercent?: boolean;
  showCount?: boolean;
  label?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  const { theme } = useTheme();
  const width = props.width ?? 40;

  const percent = createMemo(() => {
    if (props.total <= 0) return 0;
    return Math.round((props.current / props.total) * 100);
  });

  const bar = createMemo(() => {
    if (props.total <= 0) {
      return '\u2502' + '\u2591'.repeat(width) + '\u2502';
    }
    const filled = Math.round((props.current / props.total) * width);
    const empty = width - filled;
    return '\u2502' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + '\u2502';
  });

  const stats = createMemo(() => {
    const parts: string[] = [];
    if (props.showPercent !== false) {
      parts.push(`${percent()}%`);
    }
    if (props.showCount !== false) {
      parts.push(`(${props.current}/${props.total})`);
    }
    return parts.join(' ');
  });

  const fullLine = createMemo(() => {
    const label = props.label ? `${props.label} ` : '';
    return `${label}${bar()} ${stats()}`;
  });

  return (
    <text>
      <span style={{ fg: theme.textMuted }}>{props.label ? `${props.label} ` : ''}</span>
      <span style={{ fg: theme.textDim }}>{'\u2502'}</span>
      <span style={{ fg: theme.primary }}>{'\u2588'.repeat(Math.round((props.current / Math.max(props.total, 1)) * width))}</span>
      <span style={{ fg: theme.textDim }}>{'\u2591'.repeat(width - Math.round((props.current / Math.max(props.total, 1)) * width))}</span>
      <span style={{ fg: theme.textDim }}>{'\u2502'}</span>
      <span style={{ fg: theme.text }}> {percent()}%</span>
      <span style={{ fg: theme.textMuted }}> ({props.current}/{props.total})</span>
    </text>
  );
}
