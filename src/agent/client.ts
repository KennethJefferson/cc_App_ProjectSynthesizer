/**
 * Claude Agent SDK client wrapper
 *
 * Uses two separate skills:
 * - project-discovery: Analyzes SRTs and outputs manifest
 * - project-generator: Generates projects from manifest entries
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  Course,
  SrtFile,
  DiscoveryResult,
  GeneratedProject,
  ProjectFindingsManifest,
  ProjectEntry,
} from '../types';
import {
  buildDiscoveryPrompt,
  buildGeneratorPrompt,
  getDiscoverySystemPrompt,
  getGeneratorSystemPrompt,
} from './prompts';
import { parseDiscoveryResult, parseGeneratorResult } from './result-parser';
import type { SynthEventEmitter } from '../worker/events';

/**
 * Combined agent result interface
 */
interface AgentResult {
  status: 'complete' | 'no_projects' | 'failed';
  discovery: DiscoveryResult;
  projectsGenerated: GeneratedProject[];
  errors: string[];
}

/**
 * Run the complete course processing pipeline:
 * 1. Discovery phase (project-discovery skill)
 * 2. Generation phase (project-generator skill, parallel per project)
 */
export async function runCourseAgent(
  course: Course,
  srtContents: SrtFile[],
  workerId?: number,
  eventEmitter?: SynthEventEmitter
): Promise<AgentResult> {
  const errors: string[] = [];

  // Phase 1: Discovery
  const discoveryResult = await runDiscoveryAgent(course, srtContents);

  // Emit discovery complete
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: 'worker:discovery:complete',
      workerId,
      projectCount: discoveryResult.project_count,
    });
  }

  if (!discoveryResult.has_projects || !discoveryResult.manifest) {
    // No projects found
    return {
      status: 'no_projects',
      discovery: discoveryResult,
      projectsGenerated: [],
      errors: discoveryResult.manifest ? [] : ['Discovery failed to produce manifest'],
    };
  }

  // Phase 2: Generate each project (parallel)
  const projectsToGenerate = discoveryResult.manifest.projects.filter(
    (p) => p.generation_status === 'not_started'
  );

  // Emit generation start
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: 'worker:generation:start',
      workerId,
      total: projectsToGenerate.length,
    });
  }

  const projectsGenerated: GeneratedProject[] = [];
  let completedCount = 0;

  // Generate projects sequentially to track progress
  for (const project of projectsToGenerate) {
    try {
      const result = await runGeneratorAgent(course, project, srtContents);
      projectsGenerated.push(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to generate ${project.synthesized_name}: ${errorMsg}`);
      projectsGenerated.push({
        project_name: project.synthesized_name,
        output_path: '',
        files_created: [],
        status: 'failed',
        errors: [errorMsg],
      });
    }

    completedCount++;

    // Emit generation progress
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: 'worker:generation:progress',
        workerId,
        current: completedCount,
        total: projectsToGenerate.length,
        projectName: project.synthesized_name,
      });
    }
  }

  // Determine overall status
  const allFailed = projectsGenerated.every((p) => p.status === 'failed');

  return {
    status: allFailed ? 'failed' : 'complete',
    discovery: discoveryResult,
    projectsGenerated,
    errors,
  };
}

/**
 * Run the discovery skill to analyze SRTs and produce manifest
 */
async function runDiscoveryAgent(
  course: Course,
  srtContents: SrtFile[]
): Promise<DiscoveryResult> {
  const prompt = buildDiscoveryPrompt(course, srtContents);

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        allowedTools: ['Read', 'Write', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: getDiscoverySystemPrompt(),
        },
      },
    });

    let finalResultText: string | null = null;
    let lastError: string | null = null;

    for await (const message of result) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResultText = message.result;
        } else {
          lastError = (message as any).errors?.join(', ') || 'Unknown error';
        }
      }
    }

    if (finalResultText) {
      return parseDiscoveryResult(finalResultText, course.path);
    }

    return {
      has_projects: false,
      project_count: 0,
      skipped_srts: [],
      no_project_reason: lastError || 'Discovery returned no result',
      manifest: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      has_projects: false,
      project_count: 0,
      skipped_srts: [],
      no_project_reason: `Discovery error: ${errorMsg}`,
      manifest: null,
    };
  }
}

/**
 * Run the generator skill for a single project
 */
async function runGeneratorAgent(
  course: Course,
  project: ProjectEntry,
  allSrtContents: SrtFile[]
): Promise<GeneratedProject> {
  // Filter to only relevant SRTs for this project
  const relevantSrts = allSrtContents.filter(srt =>
    project.source_srts.includes(srt.filename)
  );

  const prompt = buildGeneratorPrompt(course, project, relevantSrts);

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
        permissionMode: 'acceptEdits',
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: getGeneratorSystemPrompt(),
        },
      },
    });

    let finalResultText: string | null = null;
    let lastError: string | null = null;

    for await (const message of result) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResultText = message.result;
        } else {
          lastError = (message as any).errors?.join(', ') || 'Unknown error';
        }
      }
    }

    if (finalResultText) {
      return parseGeneratorResult(finalResultText, project.synthesized_name);
    }

    return {
      project_name: project.synthesized_name,
      output_path: '',
      files_created: [],
      status: 'failed',
      errors: [lastError || 'Generator returned no result'],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      project_name: project.synthesized_name,
      output_path: '',
      files_created: [],
      status: 'failed',
      errors: [errorMsg],
    };
  }
}
