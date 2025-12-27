/** @jsxImportSource @opentui/solid */

import { createSignal, createMemo, onCleanup, type JSX } from 'solid-js';
import { createSimpleContext } from './helper.js';
import type { SynthEvent, SynthEventEmitter } from '../../../worker/events.js';
import type {
  CLIOptions,
  Phase,
  WorkerState,
  ActivityEntry,
  Stats,
} from '../types.js';

interface SynthContextValue {
  // Phase
  phase: () => Phase;

  // Stats
  stats: () => Stats;

  // Workers (array of worker states)
  workers: () => WorkerState[];

  // Recent activity (last 4)
  recentActivity: () => ActivityEntry[];

  // Timing
  elapsedMs: () => number;
  avgCourseMs: () => number;

  // Shutdown
  shutdownSignalCount: () => number;

  // Options
  options: CLIOptions;
}

interface SynthProviderProps {
  options: CLIOptions;
  children: JSX.Element;
}

function createInitialWorkers(count: number): WorkerState[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    status: 'idle' as const,
    discoveryComplete: false,
    projectsFound: 0,
    generationCurrent: 0,
    generationTotal: 0,
  }));
}

export const { use: useSynth, provider: SynthProvider } = createSimpleContext<
  SynthContextValue,
  SynthProviderProps
>({
  name: 'Synth',
  init: (props) => {
    const { options } = props;
    const startTime = Date.now();

    // Signals for reactive state
    const [phase, setPhase] = createSignal<Phase>('scanning');
    const [stats, setStats] = createSignal<Stats>({
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
    });
    const [workers, setWorkers] = createSignal<WorkerState[]>(
      createInitialWorkers(options.concurrency)
    );
    const [recentActivity, setRecentActivity] = createSignal<ActivityEntry[]>([]);
    const [elapsedMs, setElapsedMs] = createSignal(0);
    const [completedDurations, setCompletedDurations] = createSignal<number[]>([]);
    const [shutdownSignalCount, setShutdownSignalCount] = createSignal(0);

    // Elapsed time timer
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);

    onCleanup(() => clearInterval(timer));

    // Calculate average course time
    const avgCourseMs = createMemo(() => {
      const durations = completedDurations();
      if (durations.length === 0) return 0;
      return durations.reduce((a, b) => a + b, 0) / durations.length;
    });

    // Event handler
    const handleEvent = (event: SynthEvent) => {
      switch (event.type) {
        case 'scan:start':
          setPhase('scanning');
          break;

        case 'scan:complete':
          setStats((s) => ({
            ...s,
            total: event.total,
            remaining: event.total - event.skipped,
            skipped: event.skipped,
          }));
          setPhase('processing');
          break;

        case 'pool:start':
          setWorkers(createInitialWorkers(event.workerCount));
          break;

        case 'worker:start':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    ...ws,
                    status: 'discovery' as const,
                    course: event.course.path.split(/[\\/]/).pop() || event.course.path,
                    coursePath: event.course.path,
                    discoveryComplete: false,
                    projectsFound: 0,
                    generationCurrent: 0,
                    generationTotal: 0,
                    startTime: Date.now(),
                  }
                : ws
            )
          );
          break;

        case 'worker:discovery:start':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? { ...ws, status: 'discovery' as const }
                : ws
            )
          );
          break;

        case 'worker:discovery:complete':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    ...ws,
                    discoveryComplete: true,
                    projectsFound: event.projectCount,
                    status: event.projectCount > 0 ? ('generation' as const) : ('completing' as const),
                  }
                : ws
            )
          );
          break;

        case 'worker:generation:start':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    ...ws,
                    status: 'generation' as const,
                    generationTotal: event.total,
                    generationCurrent: 0,
                  }
                : ws
            )
          );
          break;

        case 'worker:generation:progress':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? { ...ws, generationCurrent: event.current }
                : ws
            )
          );
          break;

        case 'worker:complete': {
          const workerState = workers().find((w) => w.id === event.workerId);
          const duration = workerState?.startTime
            ? Date.now() - workerState.startTime
            : event.result.durationMs;

          // Add to activity
          setRecentActivity((a) => {
            const entry: ActivityEntry = {
              course: workerState?.course || event.result.coursePath.split(/[\\/]/).pop() || 'Unknown',
              success: event.result.status === 'complete',
              projectCount: event.result.projectsGenerated.length,
              durationMs: duration,
              timestamp: Date.now(),
              error:
                event.result.status === 'failed'
                  ? event.result.errors[0]
                  : undefined,
            };
            return [entry, ...a].slice(0, 4); // Keep last 4
          });

          // Track duration for average calculation
          setCompletedDurations((d) => [...d, duration]);

          // Reset worker to idle
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    id: ws.id,
                    status: 'idle' as const,
                    discoveryComplete: false,
                    projectsFound: 0,
                    generationCurrent: 0,
                    generationTotal: 0,
                  }
                : ws
            )
          );
          break;
        }

        case 'worker:error': {
          const workerState = workers().find((w) => w.id === event.workerId);

          // Add error to activity
          setRecentActivity((a) => {
            const entry: ActivityEntry = {
              course: workerState?.course || event.coursePath.split(/[\\/]/).pop() || 'Unknown',
              success: false,
              projectCount: 0,
              durationMs: workerState?.startTime ? Date.now() - workerState.startTime : 0,
              timestamp: Date.now(),
              error: event.error,
            };
            return [entry, ...a].slice(0, 4);
          });

          // Reset worker
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    id: ws.id,
                    status: 'idle' as const,
                    discoveryComplete: false,
                    projectsFound: 0,
                    generationCurrent: 0,
                    generationTotal: 0,
                  }
                : ws
            )
          );
          break;
        }

        case 'worker:idle':
          setWorkers((w) =>
            w.map((ws) =>
              ws.id === event.workerId
                ? {
                    id: ws.id,
                    status: 'idle' as const,
                    discoveryComplete: false,
                    projectsFound: 0,
                    generationCurrent: 0,
                    generationTotal: 0,
                  }
                : ws
            )
          );
          break;

        case 'stats:update':
          setStats(event.stats);
          break;

        case 'pool:complete':
          setStats(event.stats);
          setPhase('complete');
          break;

        case 'shutdown:signal':
          setShutdownSignalCount(event.count);
          if (event.count >= 1) {
            setPhase('shutdown');
          }
          break;

        case 'shutdown:complete':
          setPhase('complete');
          break;
      }
    };

    // Subscribe to events
    const unsubscribe = options.eventEmitter.on(handleEvent);
    onCleanup(unsubscribe);

    return {
      phase,
      stats,
      workers,
      recentActivity,
      elapsedMs,
      avgCourseMs,
      shutdownSignalCount,
      options,
    };
  },
});
