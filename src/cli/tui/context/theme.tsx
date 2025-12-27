/** @jsxImportSource @opentui/solid */

import { createSignal, createMemo } from 'solid-js';
import { createSimpleContext } from './helper.js';
import themeJson from './theme/app.json';

type ColorMode = 'dark' | 'light';

interface ThemeColors {
  primary: string;
  primaryDim: string;
  success: string;
  error: string;
  warning: string;
  text: string;
  textDim: string;
  border: string;
  bg: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  mode: () => ColorMode;
  setMode: (mode: ColorMode) => void;
}

function resolveColor(colorRef: string, defs: Record<string, string>): string {
  return defs[colorRef] ?? colorRef;
}

function buildTheme(mode: ColorMode): ThemeColors {
  const defs = themeJson.defs as Record<string, string>;
  const theme = themeJson.theme as Record<string, { dark: string; light: string }>;

  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    const colorRef = value[mode];
    colors[key] = resolveColor(colorRef, defs);
  }

  return colors as unknown as ThemeColors;
}

export const { use: useTheme, provider: ThemeProvider } = createSimpleContext<ThemeContextValue>({
  name: 'Theme',
  init: () => {
    const [mode, setMode] = createSignal<ColorMode>('dark');

    const colors = createMemo(() => buildTheme(mode()));

    return {
      get colors() {
        return colors();
      },
      mode,
      setMode,
    };
  },
});
