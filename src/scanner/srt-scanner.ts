/**
 * SRT file scanning within a course
 */

import { join } from 'path';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import type { SrtFile } from '../types';

/**
 * Scan a course directory for SRT files
 * Returns sorted list of SRT filenames
 */
export function scanCourseSrts(coursePath: string): string[] {
  const srtFiles: string[] = [];
  scanDirectory(coursePath, '', srtFiles);
  return srtFiles.sort(naturalSort);
}

/**
 * Recursively scan directory for SRT files
 */
function scanDirectory(basePath: string, relativePath: string, srtFiles: string[]): void {
  const currentPath = relativePath ? join(basePath, relativePath) : basePath;
  
  if (!existsSync(currentPath)) {
    return;
  }

  const entries = readdirSync(currentPath);

  for (const entry of entries) {
    // Skip CODE directory and hidden files
    if (entry === 'CODE' || entry === '__CC_Projects' || entry.startsWith('.')) {
      continue;
    }

    const entryPath = join(currentPath, entry);
    const relativeEntryPath = relativePath ? `${relativePath}/${entry}` : entry;
    const stat = statSync(entryPath);

    if (stat.isFile() && entry.toLowerCase().endsWith('.srt')) {
      srtFiles.push(relativeEntryPath);
    } else if (stat.isDirectory()) {
      // Recurse into subdirectories (module folders)
      scanDirectory(basePath, relativeEntryPath, srtFiles);
    }
  }
}

/**
 * Natural sort comparator for filenames
 * Handles numeric prefixes properly (1, 2, 10 instead of 1, 10, 2)
 */
function naturalSort(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g;
  const aParts = a.match(re) || [];
  const bParts = b.match(re) || [];

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    // Both numeric
    if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
      if (diff !== 0) return diff;
    } else {
      // String comparison
      const diff = aPart.localeCompare(bPart);
      if (diff !== 0) return diff;
    }
  }

  return aParts.length - bParts.length;
}

/**
 * Load SRT file contents
 */
export function loadSrtContent(coursePath: string, srtFile: string): SrtFile {
  const fullPath = join(coursePath, srtFile);
  let content = '';

  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    content = `[Error reading file: ${error}]`;
  }

  return {
    filename: srtFile,
    content,
  };
}

/**
 * Load all SRT contents for a course
 */
export function loadAllSrtContents(coursePath: string, srtFiles: string[]): SrtFile[] {
  return srtFiles.map((file) => loadSrtContent(coursePath, file));
}

/**
 * Strip SRT timestamps and formatting, return plain text
 */
export function stripSrtFormatting(content: string): string {
  // Remove sequence numbers (lines that are just digits)
  // Remove timestamps (00:00:00,000 --> 00:00:00,000)
  // Keep text content
  
  const lines = content.split('\n');
  const textLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(trimmed)) continue;
    
    // Skip timestamp lines
    if (/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(trimmed)) continue;
    
    // Keep text content
    textLines.push(trimmed);
  }
  
  return textLines.join(' ');
}
