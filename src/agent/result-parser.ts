/**
 * Parse agent outputs into structured results
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type {
  DiscoveryResult,
  GeneratedProject,
  ProjectFindingsManifest
} from '../types';
import { logger } from '../utils/logger';
import { readJsonFile } from '../utils/file';

/**
 * Parse discovery phase result
 *
 * Priority:
 * 1. Read from project-findings.json file on disk
 * 2. Fall back to extracting JSON from result text
 */
export function parseDiscoveryResult(
  resultText: string,
  coursePath: string
): DiscoveryResult {
  try {
    // First, try to read from file (most reliable)
    const findingsPath = join(coursePath, 'project-findings.json');
    let manifest: any = null;

    if (existsSync(findingsPath)) {
      manifest = readJsonFile(findingsPath);
      if (process.env.DEBUG) {
        logger.info(`Read manifest from file: ${findingsPath}`);
      }
    }

    // Fall back to extracting from result text
    if (!manifest) {
      manifest = extractManifestJson(resultText);
    }

    if (!manifest) {
      return {
        has_projects: false,
        project_count: 0,
        skipped_srts: [],
        no_project_reason: 'Could not parse discovery result',
        manifest: null,
      };
    }

    // Normalize and validate manifest
    const normalizedManifest = normalizeManifest(manifest, coursePath);

    return {
      has_projects: normalizedManifest.has_projects,
      project_count: normalizedManifest.projects.length,
      skipped_srts: normalizedManifest.skipped_srts,
      no_project_reason: normalizedManifest.no_project_reason,
      manifest: normalizedManifest,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse discovery result: ${errorMsg}`);

    return {
      has_projects: false,
      project_count: 0,
      skipped_srts: [],
      no_project_reason: `Parse error: ${errorMsg}`,
      manifest: null,
    };
  }
}

/**
 * Parse generation phase result
 *
 * Priority:
 * 1. Check if project folder exists on disk (most reliable)
 * 2. Fall back to extracting JSON from result text
 */
export function parseGeneratorResult(
  resultText: string,
  projectName: string,
  coursePath?: string
): GeneratedProject {
  try {
    // First, check if project was actually created on disk
    if (coursePath) {
      const projectPath = join(coursePath, 'CODE', '__CC_Projects', projectName);

      if (existsSync(projectPath)) {
        // Project exists - scan for created files
        const filesCreated = scanProjectFiles(projectPath);

        if (process.env.DEBUG) {
          logger.info(`Found project on disk: ${projectPath} with ${filesCreated.length} files`);
        }

        return {
          project_name: projectName,
          output_path: projectPath,
          files_created: filesCreated,
          status: filesCreated.length > 0 ? 'success' : 'partial',
          errors: [],
        };
      }
    }

    // Fall back to parsing JSON from result text
    const json = extractJson(resultText);

    if (!json) {
      return {
        project_name: projectName,
        output_path: '',
        files_created: [],
        status: 'failed',
        errors: ['Project folder not found and could not parse generator result'],
      };
    }

    return {
      project_name: json.project_name || projectName,
      output_path: json.output_path || '',
      files_created: Array.isArray(json.files_created) ? json.files_created : [],
      status: validateStatus(json.status),
      errors: Array.isArray(json.errors) ? json.errors : [],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse generator result: ${errorMsg}`);

    return {
      project_name: projectName,
      output_path: '',
      files_created: [],
      status: 'failed',
      errors: [`Parse error: ${errorMsg}`],
    };
  }
}

/**
 * Scan a project directory for all files (recursive)
 */
function scanProjectFiles(projectPath: string): string[] {
  const files: string[] = [];

  function scan(dir: string, prefix: string = '') {
    try {
      const { readdirSync, statSync } = require('fs');
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relativePath = prefix ? `${prefix}/${entry}` : entry;
        const stat = statSync(fullPath);

        if (stat.isFile()) {
          files.push(relativePath);
        } else if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scan(fullPath, relativePath);
        }
      }
    } catch {
      // Ignore errors during scanning
    }
  }

  scan(projectPath);
  return files;
}

/**
 * Extract manifest JSON from result text
 */
function extractManifestJson(text: string): any | null {
  // Try to find JSON in code block
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Continue to try other methods
    }
  }

  // Try to find raw JSON object
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Extract any JSON from result text
 */
function extractJson(text: string): any | null {
  return extractManifestJson(text);
}

/**
 * Normalize manifest to expected structure
 *
 * Handles schema variations from different agent outputs:
 * - project_id vs id
 * - project_name vs name vs synthesized_name
 * - source_srts as strings or objects with file property
 */
function normalizeManifest(
  parsed: any,
  coursePath: string
): ProjectFindingsManifest {
  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map((p: any, index: number) => {
        // Handle source_srts that may be objects with file property
        let sourceSrts: string[] = [];
        if (Array.isArray(p.source_srts)) {
          sourceSrts = p.source_srts.map((s: any) => {
            if (typeof s === 'string') return s;
            if (s && typeof s === 'object' && s.file) return s.file;
            return String(s);
          });
        }

        // Generate synthesized_name if not provided
        const projectName = p.project_name || p.name || 'Unknown';
        const synthesizedName = p.synthesized_name ||
          `Project_${projectName.replace(/[^a-zA-Z0-9]/g, '')}`;

        return {
          id: p.id || p.project_id || `proj_${String(index + 1).padStart(3, '0')}`,
          name: String(projectName),
          synthesized_name: String(synthesizedName),
          description: String(p.description || ''),
          source_srts: sourceSrts,
          tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
          complexity: validateComplexity(p.complexity),
          generation_status: 'not_started' as const,
          generated_at: null,
          output_path: null,
        };
      })
    : [];

  // Handle skipped_srts that may be objects with file property
  let skippedSrts: string[] = [];
  if (Array.isArray(parsed.skipped_srts)) {
    skippedSrts = parsed.skipped_srts.map((s: any) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object' && s.file) return s.file;
      return String(s);
    });
  }

  return {
    course_path: parsed.course_path || coursePath,
    discovered_at: parsed.discovered_at || parsed.analysis_date || new Date().toISOString(),
    discovery_version: parsed.discovery_version || '1.0',
    has_projects: projects.length > 0,
    projects,
    skipped_srts: skippedSrts,
    no_project_reason: projects.length === 0
      ? (parsed.no_project_reason || 'No projects identified')
      : null,
  };
}

/**
 * Validate complexity value
 */
function validateComplexity(value: any): 'beginner' | 'intermediate' | 'advanced' {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  return 'beginner';
}

/**
 * Validate generation status
 */
function validateStatus(value: any): 'success' | 'partial' | 'failed' {
  if (value === 'success' || value === 'partial' || value === 'failed') {
    return value;
  }
  return 'failed';
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseDiscoveryResult or parseGeneratorResult instead
 */
export function parseAgentResult(
  resultText: string,
  coursePath: string
): any {
  return parseDiscoveryResult(resultText, coursePath);
}

/**
 * Extract result from SDK message
 */
export function extractResultFromMessage(message: any): string | null {
  if (message.type === 'result' && message.subtype === 'success') {
    return message.result || null;
  }
  return null;
}
