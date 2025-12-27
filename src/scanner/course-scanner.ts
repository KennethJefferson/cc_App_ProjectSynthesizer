/**
 * Course scanning - finds courses in input directory
 */

import { join } from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { containsSrtFiles, listDirectories } from '../utils/file';
import type { Course } from '../types';
import { detectCourseState } from './state-detector';
import { scanCourseSrts } from './srt-scanner';

/**
 * Scan input directory for courses
 * A course is a directory containing SRT files
 */
export function scanForCourses(inputDir: string, recursive: boolean): Course[] {
  const courses: Course[] = [];

  if (!existsSync(inputDir)) {
    return courses;
  }

  if (recursive) {
    // Recursive: find all directories containing SRT files
    scanRecursive(inputDir, courses);
  } else {
    // Non-recursive: check if input dir itself is a course
    if (containsSrtFiles(inputDir)) {
      const course = buildCourse(inputDir);
      if (course) {
        courses.push(course);
      }
    } else {
      // Check immediate subdirectories
      const subdirs = listDirectories(inputDir);
      for (const subdir of subdirs) {
        const subdirPath = join(inputDir, subdir);
        if (containsSrtFiles(subdirPath)) {
          const course = buildCourse(subdirPath);
          if (course) {
            courses.push(course);
          }
        }
      }
    }
  }

  return courses;
}

/**
 * Recursively scan for courses
 */
function scanRecursive(dirPath: string, courses: Course[]): void {
  const entries = readdirSync(dirPath);

  // First check if current directory is a course
  const hasSrts = entries.some(
    (e) => e.toLowerCase().endsWith('.srt') && statSync(join(dirPath, e)).isFile()
  );

  if (hasSrts) {
    // This directory is a course
    const course = buildCourse(dirPath);
    if (course) {
      courses.push(course);
    }
    // Don't recurse into course subdirectories (they're part of the course)
    return;
  }

  // Not a course, check subdirectories
  for (const entry of entries) {
    // Skip special directories
    if (entry === 'CODE' || entry === '__CC_Projects' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(dirPath, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      scanRecursive(entryPath, courses);
    }
  }
}

/**
 * Build a Course object from a directory path
 */
function buildCourse(coursePath: string): Course | null {
  const state = detectCourseState(coursePath);
  
  // Skip already completed courses
  if (state === 'skipped') {
    return {
      path: coursePath,
      srtFiles: [],
      state: 'skipped',
      hasSubfolders: false,
    };
  }

  // Scan for SRT files
  const srtFiles = scanCourseSrts(coursePath);

  if (srtFiles.length === 0) {
    return null;
  }

  // Check if course has module subfolders
  const hasSubfolders = checkForModuleSubfolders(coursePath);

  return {
    path: coursePath,
    srtFiles,
    state,
    hasSubfolders,
  };
}

/**
 * Check if course has subdirectories with SRT files (modules)
 */
function checkForModuleSubfolders(coursePath: string): boolean {
  const entries = readdirSync(coursePath);

  for (const entry of entries) {
    if (entry === 'CODE' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(coursePath, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory() && containsSrtFiles(entryPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Parallel course scanning using multiple workers
 */
export async function scanForCoursesParallel(
  inputDir: string,
  recursive: boolean,
  _scanWorkers: number
): Promise<Course[]> {
  // For simplicity, use synchronous scanning for now
  // Parallel scanning would be beneficial for network drives or very large directories
  return scanForCourses(inputDir, recursive);
}
