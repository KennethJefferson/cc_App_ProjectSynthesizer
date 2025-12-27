/** @jsxImportSource @opentui/solid */

import { useTheme } from '../context/theme.js';
import type { WorkerStatus } from '../types.js';

export type StatusType = WorkerStatus | 'complete' | 'failed' | 'skipped' | 'pending';

interface StatusIconProps {
  status: StatusType;
}

const iconMap: Record<StatusType, string> = {
  idle: '\u25CB',       // ○
  discovery: '\u25CF',  // ●
  generation: '\u25CF', // ●
  completing: '\u25CF', // ●
  complete: '\u2713',   // ✓
  failed: '\u2717',     // ✗
  skipped: '\u2298',    // ⊘
  pending: '\u25CB',    // ○
};

export function StatusIcon(props: StatusIconProps) {
  const theme = useTheme();

  const getColor = (): string => {
    switch (props.status) {
      case 'idle':
      case 'pending':
        return theme.colors.textDim;
      case 'discovery':
      case 'generation':
        return theme.colors.primary;
      case 'completing':
        return theme.colors.warning;
      case 'complete':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'skipped':
        return theme.colors.textDim;
      default:
        return theme.colors.text;
    }
  };

  return <text style={{ fg: getColor() }}>{iconMap[props.status]}</text>;
}
