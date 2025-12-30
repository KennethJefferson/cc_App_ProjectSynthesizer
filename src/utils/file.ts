/**
 * File system utility functions
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { readdir, stat, access, readFile as readFileAsync } from 'fs/promises';
import { join, basename } from 'path';
import type { ProgressFile } from '../types';

/**
 * Check if a path exists (async version)
 */
export async function pathExistsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path exists
 */
export function pathExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Read a file as UTF-8 string
 */
export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

/**
 * Write content to a file (creates directories if needed)
 */
export function writeFile(path: string, content: string): void {
  const dir = join(path, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, 'utf-8');
}

/**
 * Read and parse JSON file
 */
export function readJsonFile<T>(path: string): T | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON to file
 */
export function writeJsonFile(path: string, data: unknown): void {
  writeFile(path, JSON.stringify(data, null, 2));
}

/**
 * Read progress.json from course folder
 */
export function readProgressFile(coursePath: string): ProgressFile | null {
  const progressPath = join(coursePath, 'progress.json');
  return readJsonFile<ProgressFile>(progressPath);
}

/**
 * Delete a directory recursively
 */
export function deleteDirectory(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Create directory if it doesn't exist
 */
export function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * List all files in a directory with a specific extension
 */
export function listFiles(dirPath: string, extension?: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = readdirSync(dirPath);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isFile()) {
      if (!extension || entry.toLowerCase().endsWith(extension.toLowerCase())) {
        files.push(entry);
      }
    }
  }

  return files.sort();
}

/**
 * List all subdirectories in a directory
 */
export function listDirectories(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = readdirSync(dirPath);
  const dirs: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      dirs.push(entry);
    }
  }

  return dirs.sort();
}

/**
 * Check if directory contains any SRT files (including subdirectories)
 */
export function containsSrtFiles(dirPath: string): boolean {
  if (!existsSync(dirPath)) {
    return false;
  }

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isFile() && entry.toLowerCase().endsWith('.srt')) {
      return true;
    }

    if (stat.isDirectory() && entry !== 'CODE') {
      if (containsSrtFiles(fullPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all SRT files from a directory (and optionally subdirectories)
 */
export function getAllSrtFiles(dirPath: string, recursive: boolean = false): string[] {
  const srtFiles: string[] = [];

  function scan(currentPath: string, prefix: string = '') {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const relativePath = prefix ? `${prefix}/${entry}` : entry;
      const stat = statSync(fullPath);

      if (stat.isFile() && entry.toLowerCase().endsWith('.srt')) {
        srtFiles.push(relativePath);
      } else if (recursive && stat.isDirectory() && entry !== 'CODE' && entry !== '__CC_Projects') {
        scan(fullPath, relativePath);
      }
    }
  }

  if (existsSync(dirPath)) {
    scan(dirPath);
  }

  return srtFiles.sort();
}

/**
 * Check if directory has subdirectories (excluding CODE folder)
 */
export function hasSubdirectories(dirPath: string): boolean {
  if (!existsSync(dirPath)) {
    return false;
  }

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    if (entry === 'CODE' || entry === '__CC_Projects') {
      continue;
    }

    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Check if this subdirectory contains SRT files
      if (containsSrtFiles(fullPath)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// ASYNC VERSIONS - For non-blocking TUI operations
// ============================================================================

/**
 * List all subdirectories in a directory (async)
 */
export async function listDirectoriesAsync(dirPath: string): Promise<string[]> {
  if (!(await pathExistsAsync(dirPath))) {
    return [];
  }

  const entries = await readdir(dirPath);
  const dirs: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      dirs.push(entry);
    }
  }

  return dirs.sort();
}

/**
 * Check if directory contains any SRT files (async, recursive)
 */
export async function containsSrtFilesAsync(dirPath: string): Promise<boolean> {
  if (!(await pathExistsAsync(dirPath))) {
    return false;
  }

  const entries = await readdir(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isFile() && entry.toLowerCase().endsWith('.srt')) {
      return true;
    }

    if (entryStat.isDirectory() && entry !== 'CODE' && entry !== '__CC_Projects') {
      if (await containsSrtFilesAsync(fullPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Read and parse JSON file (async)
 */
export async function readJsonFileAsync<T>(path: string): Promise<T | null> {
  try {
    const content = await readFileAsync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Read progress.json from course folder (async)
 */
export async function readProgressFileAsync(coursePath: string): Promise<ProgressFile | null> {
  const progressPath = join(coursePath, 'progress.json');
  return readJsonFileAsync<ProgressFile>(progressPath);
}
