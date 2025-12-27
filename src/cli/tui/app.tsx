/** @jsxImportSource @opentui/solid */

import { render } from '@opentui/solid';
import { ThemeProvider } from './context/theme.js';
import { SynthProvider } from './context/synth.js';
import { MainView } from './routes/main.js';
import type { CLIOptions } from './types.js';

function App(props: { options: CLIOptions }) {
  return (
    <ThemeProvider>
      <SynthProvider options={props.options}>
        <MainView />
      </SynthProvider>
    </ThemeProvider>
  );
}

export async function startTUI(options: CLIOptions): Promise<void> {
  return new Promise<void>((_resolve) => {
    render(
      () => <App options={options} />,
      {
        targetFps: 30,
        useMouse: false,
      }
    );

    // The TUI will run until shutdown is triggered
  });
}
