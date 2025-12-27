/**
 * Parse agent outputs into structured results
 */

import type { 
  DiscoveryResult, 
  GeneratedProject, 
  ProjectFindingsManifest 
} from '../types';
import { logger } from '../utils/logger';

/**
 * Parse discovery phase result
 */
export function parseDiscoveryResult(
  resultText: string,
  coursePath: string
): DiscoveryResult {
  try {
    const manifest = extractManifestJson(resultText);

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
 */
export function parseGeneratorResult(
  resultText: string,
  projectName: string
): GeneratedProject {
  try {
    const json = extractJson(resultText);

    if (!json) {
      return {
        project_name: projectName,
        output_path: '',
        files_created: [],
        status: 'failed',
        errors: ['Could not parse generator result'],
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
 */
function normalizeManifest(
  parsed: any,
  coursePath: string
): ProjectFindingsManifest {
  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map((p: any, index: number) => ({
        id: p.id || `proj_${String(index + 1).padStart(3, '0')}`,
        name: String(p.name || 'Unknown'),
        synthesized_name: String(p.synthesized_name || `Project_Unknown${index + 1}`),
        description: String(p.description || ''),
        source_srts: Array.isArray(p.source_srts) ? p.source_srts : [],
        tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
        complexity: validateComplexity(p.complexity),
        generation_status: 'not_started' as const,
        generated_at: null,
        output_path: null,
      }))
    : [];

  return {
    course_path: parsed.course_path || coursePath,
    discovered_at: parsed.discovered_at || new Date().toISOString(),
    discovery_version: parsed.discovery_version || '1.0',
    has_projects: projects.length > 0,
    projects,
    skipped_srts: Array.isArray(parsed.skipped_srts) ? parsed.skipped_srts : [],
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
