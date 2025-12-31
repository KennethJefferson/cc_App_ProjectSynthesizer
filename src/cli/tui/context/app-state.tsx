/** @jsxImportSource @opentui/solid */
/**
 * App State Context - Bridges SynthEventEmitter to reactive TUI state
 */

import { createSignal, createMemo, onCleanup, onMount } from 'solid-js';
import { createSimpleContext } from './helper.js';
import type { SynthEventEmitter, SynthEvent } from '../../../worker/events.js';
import type { Course, PoolStats } from '../../../types/index.js';
import type { ShutdownController } from '../../../types/index.js';

export type AppPhase = 'idle' | 'scanning' | 'processing' | 'complete' | 'shutdown';

export type WorkerPhase = 'idle' | 'discovery' | 'generation' | 'github' | 'complete' | 'error';

export interface WorkerState {
  id: number;
  phase: WorkerPhase;
  courseName: string | null;
  coursePath: string | null;
  projectsTotal: number;
  projectsCurrent: number;
  currentProject: string | null;
  error: string | null;
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  workerId?: number;
}

export interface AppStateProps {
  eventEmitter: SynthEventEmitter;
  shutdownController: ShutdownController;
  inputDir: string;
  concurrency: number;
}

export interface AppStateContext {
  // Overall state
  phase: () => AppPhase;
  inputDir: string;

  // Scanning phase
  coursesFound: () => Course[];
  scanComplete: () => boolean;

  // Processing phase
  stats: () => PoolStats;
  workers: () => WorkerState[];

  // Logs
  logs: () => LogEntry[];

  // Computed
  overallProgress: () => { current: number; total: number; percent: number };
  elapsedTime: () => number;

  // Shutdown state
  isShuttingDown: () => boolean;
  ctrlCCount: () => number;

  // Actions
  requestShutdown: () => void;
  shutdownRequested: () => boolean;
}

const { provider: AppStateProvider, use: useAppState } = createSimpleContext<AppStateContext, AppStateProps>({
  name: 'AppState',
  init: (props) => {
    const { eventEmitter, shutdownController, inputDir, concurrency } = props;

    // Signals
    const [phase, setPhase] = createSignal<AppPhase>('idle');
    const [coursesFound, setCoursesFound] = createSignal<Course[]>([]);
    const [scanComplete, setScanComplete] = createSignal(false);
    const [shutdownRequested, setShutdownRequested] = createSignal(false);
    const [isShuttingDown, setIsShuttingDown] = createSignal(false);
    const [ctrlCCount, setCtrlCCount] = createSignal(0);
    const [startTime, setStartTime] = createSignal<number | null>(null);
    const [elapsedTime, setElapsedTime] = createSignal(0);

    const [stats, setStats] = createSignal<PoolStats>({
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
    });

    // Initialize workers
    const initialWorkers: WorkerState[] = Array.from({ length: concurrency }, (_, i) => ({
      id: i,
      phase: 'idle' as WorkerPhase,
      courseName: null,
      coursePath: null,
      projectsTotal: 0,
      projectsCurrent: 0,
      currentProject: null,
      error: null,
    }));
    const [workers, setWorkers] = createSignal<WorkerState[]>(initialWorkers);

    const [logs, setLogs] = createSignal<LogEntry[]>([]);
    let logId = 0;

    const addLog = (type: LogEntry['type'], message: string, workerId?: number) => {
      setLogs((prev) => [
        ...prev.slice(-100), // Keep last 100 logs
        { id: ++logId, timestamp: new Date(), type, message, workerId },
      ]);
    };

    const updateWorker = (workerId: number, updates: Partial<WorkerState>) => {
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerId ? { ...w, ...updates } : w))
      );
    };

    // Computed
    const overallProgress = createMemo(() => {
      const s = stats();
      const current = s.completed + s.failed;
      const total = s.total;
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      return { current, total, percent };
    });

    // Elapsed time timer
    let elapsedTimer: NodeJS.Timeout | null = null;

    onMount(() => {
      // Subscribe to events
      const unsubscribe = eventEmitter.on((event: SynthEvent) => {
        handleEvent(event);
      });

      onCleanup(() => {
        unsubscribe();
        if (elapsedTimer) clearInterval(elapsedTimer);
      });
    });

    const handleEvent = (event: SynthEvent) => {
      switch (event.type) {
        case 'scan:start':
          setPhase('scanning');
          addLog('info', 'Scanning for courses...');
          break;

        case 'scan:course-found':
          setCoursesFound((prev) => [...prev, event.course]);
          break;

        case 'scan:complete':
          setScanComplete(true);
          addLog('success', `Found ${event.total} course(s), ${event.skipped} skipped`);
          break;

        case 'pool:start':
          setPhase('processing');
          setStartTime(Date.now());
          elapsedTimer = setInterval(() => {
            const start = startTime();
            if (start) setElapsedTime(Math.floor((Date.now() - start) / 1000));
          }, 1000);
          addLog('info', `Starting ${event.workerCount} worker(s)`);
          break;

        case 'pool:complete':
          setPhase('complete');
          setStats(event.stats);
          if (elapsedTimer) clearInterval(elapsedTimer);
          addLog('success', `Complete: ${event.stats.completed} succeeded, ${event.stats.failed} failed`);
          break;

        case 'worker:start':
          updateWorker(event.workerId, {
            phase: 'discovery',
            courseName: event.course.name,
            coursePath: event.course.path,
            projectsTotal: 0,
            projectsCurrent: 0,
            currentProject: null,
            error: null,
          });
          addLog('info', `Starting: ${event.course.name}`, event.workerId);
          break;

        case 'worker:discovery:start':
          updateWorker(event.workerId, { phase: 'discovery' });
          break;

        case 'worker:discovery:complete':
          updateWorker(event.workerId, {
            phase: 'generation',
            projectsTotal: event.projectCount,
            projectsCurrent: 0,
          });
          addLog('info', `Discovery: ${event.projectCount} project(s) found`, event.workerId);
          break;

        case 'worker:generation:start':
          updateWorker(event.workerId, {
            phase: 'generation',
            projectsTotal: event.total,
            projectsCurrent: 0,
          });
          break;

        case 'worker:generation:progress':
          updateWorker(event.workerId, {
            projectsCurrent: event.current,
            projectsTotal: event.total,
            currentProject: event.projectName,
          });
          addLog('success', `Generated: ${event.projectName}`, event.workerId);
          break;

        case 'worker:github:start':
          updateWorker(event.workerId, {
            phase: 'github',
            currentProject: event.projectName,
          });
          break;

        case 'worker:github:complete':
          addLog('success', `Pushed: ${event.repoUrl}`, event.workerId);
          break;

        case 'worker:github:skipped':
          addLog('warning', `GitHub skipped: ${event.reason}`, event.workerId);
          break;

        case 'worker:github:failed':
          addLog('error', `GitHub failed: ${event.error}`, event.workerId);
          break;

        case 'worker:complete':
          updateWorker(event.workerId, {
            phase: 'complete',
            currentProject: null,
          });
          const status = event.result.status === 'complete' ? 'success' : 'warning';
          addLog(status as LogEntry['type'], `Completed: ${event.result.projectsGenerated.length} project(s)`, event.workerId);
          break;

        case 'worker:error':
          updateWorker(event.workerId, {
            phase: 'error',
            error: event.error,
          });
          addLog('error', event.error, event.workerId);
          break;

        case 'worker:idle':
          updateWorker(event.workerId, {
            phase: 'idle',
            courseName: null,
            coursePath: null,
            currentProject: null,
          });
          break;

        case 'stats:update':
          setStats(event.stats);
          break;

        case 'shutdown:signal':
          setShutdownRequested(true);
          setPhase('shutdown');
          addLog('warning', event.count === 1 ? 'Graceful shutdown...' : 'Force shutdown!');
          break;

        case 'shutdown:complete':
          addLog('info', 'Shutdown complete');
          break;
      }
    };

    const requestShutdown = () => {
      const count = ctrlCCount() + 1;
      setCtrlCCount(count);
      setIsShuttingDown(true);
      setShutdownRequested(true);
      setPhase('shutdown');

      // Mark the shutdown controller
      (shutdownController as any).isShuttingDown = true;

      // Emit event for UI
      eventEmitter.emit({ type: 'shutdown:signal', count });

      if (count === 1) {
        // First Ctrl+C: graceful shutdown - let current work finish
        addLog('warning', 'Graceful shutdown requested... (press Ctrl+C again to force)');
      } else {
        // Second Ctrl+C: force exit
        (shutdownController as any).forceExit = true;
        addLog('warning', 'Force shutdown!');
        // Give UI a moment to show the message, then exit
        setTimeout(() => process.exit(0), 100);
      }
    };

    return {
      phase,
      inputDir,
      coursesFound,
      scanComplete,
      stats,
      workers,
      logs,
      overallProgress,
      elapsedTime,
      isShuttingDown,
      ctrlCCount,
      requestShutdown,
      shutdownRequested,
    };
  },
});

export { AppStateProvider, useAppState };
