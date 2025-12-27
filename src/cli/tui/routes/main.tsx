/** @jsxImportSource @opentui/solid */

import { useSynth } from '../context/synth.js';
import { useTheme } from '../context/theme.js';
import { Header } from '../component/Header.js';
import { OverallProgress } from '../component/OverallProgress.js';
import { WorkerPanel } from '../component/WorkerPanel.js';
import { RecentActivity } from '../component/RecentActivity.js';
import { MetricsPanel } from '../component/MetricsPanel.js';

export function MainView() {
  const synth = useSynth();
  const theme = useTheme();

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      <Header />
      <OverallProgress />
      <WorkerPanel />
      <RecentActivity />
      <MetricsPanel />
    </box>
  );
}
