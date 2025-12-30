/** @jsxImportSource @opentui/solid */
/**
 * Theme Context - Provides color scheme and icons
 */

import { RGBA } from '@opentui/core';
import { createMemo } from 'solid-js';
import { createSimpleContext } from './helper.js';
import themeJson from './theme/default.json';

export interface Theme {
  primary: RGBA;
  secondary: RGBA;
  error: RGBA;
  success: RGBA;
  warning: RGBA;
  info: RGBA;
  text: RGBA;
  textMuted: RGBA;
  textDim: RGBA;
  border: RGBA;
  borderSubtle: RGBA;
  background: RGBA;
  backgroundAlt: RGBA;
}

export interface ThemeIcons {
  completed: string;
  running: string;
  pending: string;
  failed: string;
  cancelled: string;
  discovery: string;
  generation: string;
}

export interface ThemeContext {
  theme: Theme;
  icons: ThemeIcons;
}

const { provider: ThemeProvider, use: useTheme } = createSimpleContext<ThemeContext>({
  name: 'Theme',
  init: () => {
    const theme = createMemo(() => ({
      primary: RGBA.fromHex(themeJson.colors.primary),
      secondary: RGBA.fromHex(themeJson.colors.secondary),
      error: RGBA.fromHex(themeJson.colors.error),
      success: RGBA.fromHex(themeJson.colors.success),
      warning: RGBA.fromHex(themeJson.colors.warning),
      info: RGBA.fromHex(themeJson.colors.info),
      text: RGBA.fromHex(themeJson.colors.text),
      textMuted: RGBA.fromHex(themeJson.colors.textMuted),
      textDim: RGBA.fromHex(themeJson.colors.textDim),
      border: RGBA.fromHex(themeJson.colors.border),
      borderSubtle: RGBA.fromHex(themeJson.colors.borderSubtle),
      background: RGBA.fromHex(themeJson.colors.background),
      backgroundAlt: RGBA.fromHex(themeJson.colors.backgroundAlt),
    }));

    return {
      get theme() {
        return theme();
      },
      icons: themeJson.icons as ThemeIcons,
    };
  },
});

export { ThemeProvider, useTheme };
