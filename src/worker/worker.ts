/**
 * Individual worker - processes a single course
 */

import type { Course, CourseResult } from '../types';
import { runCourseAgent } from '../agent/client';
import { loadAllSrtContents } from '../scanner/srt-scanner';
import type { SynthEventEmitter } from './events';

/**
 * Process a single course through discovery and generation phases
 */
export async function processCourse(
  course: Course,
  inputDir: string,
  workerId?: number,
  eventEmitter?: SynthEventEmitter
): Promise<CourseResult> {
  const startTime = Date.now();

  try {
    // Load SRT contents
    const srtContents = loadAllSrtContents(course.path, course.srtFiles);

    // Run Claude agent pipeline (discovery + generation)
    const agentResult = await runCourseAgent(course, srtContents, workerId, eventEmitter);

    const durationMs = Date.now() - startTime;

    return {
      coursePath: course.path,
      status: agentResult.status,
      discovery: agentResult.discovery,
      projectsGenerated: agentResult.projectsGenerated,
      errors: agentResult.errors,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      coursePath: course.path,
      status: 'failed',
      discovery: {
        has_projects: false,
        project_count: 0,
        skipped_srts: [],
        no_project_reason: `Processing error: ${errorMessage}`,
        manifest: null,
      },
      projectsGenerated: [],
      errors: [errorMessage],
      durationMs,
    };
  }
}
