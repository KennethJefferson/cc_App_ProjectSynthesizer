/**
 * Console logging utilities with color formatting
 */

import { appendFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info: (msg: string) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} [INFO] ${msg}`);
  },

  success: (msg: string) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.green}[SUCCESS]${colors.reset} ${msg}`);
  },

  warn: (msg: string) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${msg}`);
  },

  error: (msg: string) => {
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${msg}`);
  },

  debug: (msg: string) => {
    if (process.env.DEBUG) {
      console.log(`${colors.gray}[${timestamp()}] [DEBUG] ${msg}${colors.reset}`);
    }
  },

  /**
   * Log course-specific error with red highlighting and write to error.log
   */
  courseError: (coursePath: string, error: string, inputDir: string) => {
    const msg = `The course located at "${coursePath}" has failed: ${error}`;
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERROR] ${msg}${colors.reset}`);
    console.error(`${colors.red}Moving on to the next course.${colors.reset}`);

    // Append to error.log in input directory
    try {
      const logEntry = `[${timestamp()}] FAILED: ${coursePath}\n  Reason: ${error}\n\n`;
      appendFileSync(join(inputDir, 'error.log'), logEntry);
    } catch (e) {
      console.error(`${colors.red}Failed to write to error.log: ${e}${colors.reset}`);
    }
  },

  /**
   * Log progress update
   */
  progress: (completed: number, total: number, skipped: number = 0) => {
    const remaining = total - completed - skipped;
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ` +
      `${colors.cyan}[PROGRESS]${colors.reset} ` +
      `${colors.green}${completed} completed${colors.reset}, ` +
      `${colors.yellow}${skipped} skipped${colors.reset}, ` +
      `${colors.blue}${remaining} remaining${colors.reset} ` +
      `(${total} total)`
    );
  },

  /**
   * Log worker activity
   */
  worker: (workerId: number, action: string, detail?: string) => {
    const detailStr = detail ? `: ${detail}` : '';
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ` +
      `${colors.magenta}[Worker ${workerId}]${colors.reset} ${action}${detailStr}`
    );
  },

  /**
   * Print a banner/header
   */
  banner: (text: string) => {
    const line = '='.repeat(60);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.cyan}  ${text}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },

  /**
   * Print final summary
   */
  summary: (stats: { total: number; completed: number; failed: number; skipped: number; durationMs: number }) => {
    const durationSec = (stats.durationMs / 1000).toFixed(1);
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`  Total courses:     ${stats.total}`);
    console.log(`  ${colors.green}Completed:         ${stats.completed}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped:           ${stats.skipped}${colors.reset}`);
    console.log(`  ${colors.red}Failed:            ${stats.failed}${colors.reset}`);
    console.log(`  Duration:          ${durationSec}s`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  },
};
