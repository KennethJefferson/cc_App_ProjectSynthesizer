/** @jsxImportSource @opentui/solid */

import { createMemo } from 'solid-js';
import { useTheme } from '../context/theme.js';

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercent?: boolean;
  showCount?: boolean;
  variant?: 'primary' | 'success' | 'error';
}

export function ProgressBar(props: ProgressBarProps) {
  const theme = useTheme();

  const width = props.width ?? 40;
  const showPercent = props.showPercent ?? true;
  const showCount = props.showCount ?? true;
  const variant = props.variant ?? 'primary';

  const percent = createMemo(() => {
    if (props.total === 0) return 0;
    return Math.round((props.current / props.total) * 100);
  });

  const filledWidth = createMemo(() => {
    if (props.total === 0) return 0;
    return Math.round((props.current / props.total) * width);
  });

  const getColor = (): string => {
    switch (variant) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const bar = createMemo(() => {
    const filled = '\u2588'.repeat(filledWidth());  // █
    const empty = '\u2591'.repeat(width - filledWidth());  // ░
    return `\u2502${filled}${empty}\u2502`; // │...│
  });

  const suffix = createMemo(() => {
    const parts: string[] = [];
    if (showPercent) parts.push(`${percent()}%`);
    if (showCount) parts.push(`(${props.current}/${props.total})`);
    return parts.join(' ');
  });

  return (
    <box flexDirection="row" gap={1}>
      <text style={{ fg: getColor() }}>{bar()}</text>
      <text style={{ fg: theme.colors.text }}>{suffix()}</text>
    </box>
  );
}
