/**
 * Course state detection - determines if course needs processing
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { readProgressFile, deleteDirectory } from '../utils/file';
import type { CourseState } from '../types';

/**
 * Detect the current state of a course
 *
 * Logic:
 * 1. If progress.json exists and status="complete" -> skip
 * 2. If progress.json exists and status="started" -> restart (incomplete)
 * 3. If no progress.json but CODE/__CC_Projects exists -> skip (assume complete)
 * 4. Otherwise -> pending (fresh course)
 */
export function detectCourseState(coursePath: string): CourseState {
  const progressPath = join(coursePath, 'progress.json');
  const ccProjectsPath = join(coursePath, 'CODE', '__CC_Projects');

  // Check for progress.json
  if (existsSync(progressPath)) {
    const progress = readProgressFile(coursePath);

    if (progress) {
      if (progress.status === 'complete') {
        return 'skipped'; // Already done
      } else {
        // Status is "started" - incomplete, need to restart
        cleanupIncompleteCourse(coursePath);
        return 'pending';
      }
    } else {
      // Corrupted progress file, treat as incomplete
      cleanupIncompleteCourse(coursePath);
      return 'pending';
    }
  }

  // No progress.json, check for __CC_Projects folder
  if (existsSync(ccProjectsPath)) {
    // Assume complete if folder exists (user may have manually deleted progress.json)
    return 'skipped';
  }

  // Fresh course
  return 'pending';
}

/**
 * Cleanup an incomplete course before restarting
 * Deletes __CC_Projects folder but keeps CODE folder
 */
function cleanupIncompleteCourse(coursePath: string): void {
  const ccProjectsPath = join(coursePath, 'CODE', '__CC_Projects');

  if (existsSync(ccProjectsPath)) {
    try {
      deleteDirectory(ccProjectsPath);
    } catch (_error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Prepare course for processing
 * - Ensures CODE/__CC_Projects directory exists
 * - Creates progress.json with "started" status
 */
export function prepareCourseForProcessing(coursePath: string): void {
  // This is now handled by the Claude agent via the skill
  // The agent will create progress.json and the folder structure
}
