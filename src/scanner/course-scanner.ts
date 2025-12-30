/**
 * Course scanning - finds courses in input directory
 *
 * A COURSE is a top-level directory that contains SRT files (directly or in subfolders).
 * Subfolders within a course are MODULES, not separate courses.
 *
 * Example structure:
 *   inputDir/
 *     Course A/                  <- This is a COURSE
 *       01 - Introduction/       <- This is a module (subfolder)
 *         lesson1.srt
 *       02 - Getting Started/    <- This is a module
 *         lesson2.srt
 *       progress.json            <- Goes here (course root)
 *       CODE/__CC_Projects/      <- Goes here (course root)
 *     Course B/                  <- This is another COURSE
 *       video.srt
 */

import { join } from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { listDirectories, listDirectoriesAsync, pathExistsAsync, containsSrtFilesAsync } from '../utils/file';
import type { Course } from '../types';
import { detectCourseState, detectCourseStateAsync } from './state-detector';
import { scanCourseSrts, scanCourseSrtsAsync } from './srt-scanner';

/**
 * Check if a directory contains SRT files anywhere within it (recursive)
 */
function containsSrtFilesRecursive(dirPath: string): boolean {
  if (!existsSync(dirPath)) return false;

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    // Skip special directories
    if (entry === 'CODE' || entry === '__CC_Projects' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(dirPath, entry);
    const stat = statSync(entryPath);

    if (stat.isFile() && entry.toLowerCase().endsWith('.srt')) {
      return true;
    }

    if (stat.isDirectory()) {
      if (containsSrtFilesRecursive(entryPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Scan input directory for courses
 *
 * When recursive=true:
 *   - Immediate children of inputDir that contain SRTs are courses
 *   - Does NOT descend into course subfolders (they're modules, not courses)
 *
 * When recursive=false:
 *   - If inputDir itself contains SRTs, it's the course
 *   - Otherwise, immediate children are checked as potential courses
 */
export function scanForCourses(inputDir: string, recursive: boolean): Course[] {
  const courses: Course[] = [];

  if (!existsSync(inputDir)) {
    return courses;
  }

  if (recursive) {
    // Recursive mode: find course folders (immediate children with SRTs)
    const subdirs = listDirectories(inputDir);

    for (const subdir of subdirs) {
      // Skip special directories
      if (subdir === 'CODE' || subdir === '__CC_Projects' || subdir.startsWith('.')) {
        continue;
      }

      const subdirPath = join(inputDir, subdir);

      if (containsSrtFilesRecursive(subdirPath)) {
        const course = buildCourse(subdirPath);
        if (course) {
          courses.push(course);
        }
      }
    }
  } else {
    // Non-recursive: check if input dir itself is a course
    if (containsSrtFilesRecursive(inputDir)) {
      const course = buildCourse(inputDir);
      if (course) {
        courses.push(course);
      }
    } else {
      // Check immediate subdirectories
      const subdirs = listDirectories(inputDir);
      for (const subdir of subdirs) {
        if (subdir === 'CODE' || subdir === '__CC_Projects' || subdir.startsWith('.')) {
          continue;
        }

        const subdirPath = join(inputDir, subdir);
        if (containsSrtFilesRecursive(subdirPath)) {
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
 * Extract course name from path
 */
function extractCourseName(coursePath: string): string {
  return coursePath.split(/[\\/]/).pop() || coursePath;
}

/**
 * Build a Course object from a directory path
 */
function buildCourse(coursePath: string): Course | null {
  const state = detectCourseState(coursePath);
  const name = extractCourseName(coursePath);

  // Skip already completed courses
  if (state === 'skipped') {
    return {
      path: coursePath,
      name,
      srtFiles: [],
      state: 'skipped',
      hasSubfolders: false,
    };
  }

  // Scan for SRT files (recursively within course)
  const srtFiles = scanCourseSrts(coursePath);

  if (srtFiles.length === 0) {
    return null;
  }

  // Check if course has module subfolders
  const hasSubfolders = checkForModuleSubfolders(coursePath);

  return {
    path: coursePath,
    name,
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

    if (stat.isDirectory() && containsSrtFilesRecursive(entryPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Parallel course scanning using multiple workers (ASYNC - non-blocking)
 */
export async function scanForCoursesParallel(
  inputDir: string,
  recursive: boolean,
  _scanWorkers: number
): Promise<Course[]> {
  // Use async scanning to keep TUI responsive
  return scanForCoursesAsync(inputDir, recursive);
}

// ============================================================================
// ASYNC VERSIONS - For non-blocking TUI operations
// ============================================================================

/**
 * Check if a directory contains SRT files anywhere within it (async, recursive)
 */
async function containsSrtFilesRecursiveAsync(dirPath: string): Promise<boolean> {
  if (!(await pathExistsAsync(dirPath))) return false;

  const entries = await readdir(dirPath);

  for (const entry of entries) {
    // Skip special directories
    if (entry === 'CODE' || entry === '__CC_Projects' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(dirPath, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isFile() && entry.toLowerCase().endsWith('.srt')) {
      return true;
    }

    if (entryStat.isDirectory()) {
      if (await containsSrtFilesRecursiveAsync(entryPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Scan input directory for courses (async - non-blocking)
 */
async function scanForCoursesAsync(inputDir: string, recursive: boolean): Promise<Course[]> {
  const courses: Course[] = [];

  if (!(await pathExistsAsync(inputDir))) {
    return courses;
  }

  if (recursive) {
    // Recursive mode: find course folders (immediate children with SRTs)
    const subdirs = await listDirectoriesAsync(inputDir);

    for (const subdir of subdirs) {
      // Skip special directories
      if (subdir === 'CODE' || subdir === '__CC_Projects' || subdir.startsWith('.')) {
        continue;
      }

      const subdirPath = join(inputDir, subdir);

      if (await containsSrtFilesRecursiveAsync(subdirPath)) {
        const course = await buildCourseAsync(subdirPath);
        if (course) {
          courses.push(course);
        }
      }
    }
  } else {
    // Non-recursive: check if input dir itself is a course
    if (await containsSrtFilesRecursiveAsync(inputDir)) {
      const course = await buildCourseAsync(inputDir);
      if (course) {
        courses.push(course);
      }
    } else {
      // Check immediate subdirectories
      const subdirs = await listDirectoriesAsync(inputDir);
      for (const subdir of subdirs) {
        if (subdir === 'CODE' || subdir === '__CC_Projects' || subdir.startsWith('.')) {
          continue;
        }

        const subdirPath = join(inputDir, subdir);
        if (await containsSrtFilesRecursiveAsync(subdirPath)) {
          const course = await buildCourseAsync(subdirPath);
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
 * Build a Course object from a directory path (async)
 */
async function buildCourseAsync(coursePath: string): Promise<Course | null> {
  const state = await detectCourseStateAsync(coursePath);
  const name = extractCourseName(coursePath);

  // Skip already completed courses
  if (state === 'skipped') {
    return {
      path: coursePath,
      name,
      srtFiles: [],
      state: 'skipped',
      hasSubfolders: false,
    };
  }

  // Scan for SRT files (recursively within course)
  const srtFiles = await scanCourseSrtsAsync(coursePath);

  if (srtFiles.length === 0) {
    return null;
  }

  // Check if course has module subfolders
  const hasSubfolders = await checkForModuleSubfoldersAsync(coursePath);

  return {
    path: coursePath,
    name,
    srtFiles,
    state,
    hasSubfolders,
  };
}

/**
 * Check if course has subdirectories with SRT files (modules) - async
 */
async function checkForModuleSubfoldersAsync(coursePath: string): Promise<boolean> {
  const entries = await readdir(coursePath);

  for (const entry of entries) {
    if (entry === 'CODE' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(coursePath, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isDirectory() && (await containsSrtFilesRecursiveAsync(entryPath))) {
      return true;
    }
  }

  return false;
}
