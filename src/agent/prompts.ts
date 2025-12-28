/**
 * Prompt construction for Claude agents
 *
 * These prompts "hydrate" the skill logic directly since the SDK
 * doesn't have the CLI runtime that interprets slash commands.
 *
 * Key strategy: "Virtual Filesystem Jail"
 * - Explicitly define OUTPUT_ROOT as the ONLY writable location
 * - Use one-shot examples to break the "code near source" tendency
 * - Add strict negative constraints
 */

import type { Course, SrtFile, ProjectEntry } from '../types';

/**
 * Build the prompt for the discovery phase
 * Uses the project-discovery skill for analysis
 */
export function buildDiscoveryPrompt(course: Course, srtContents: SrtFile[]): string {
  const srtSection = srtContents
    .map((srt) => `=== ${srt.filename} ===\n${srt.content}`)
    .join('\n\n');

  return `Discover projects in the following course transcripts.

## Course Information
- **Course Path**: ${course.path}
- **Course Name**: ${course.name}
- **Total SRT Files**: ${srtContents.length}
- **Has Subfolders**: ${course.hasSubfolders}

## SRT File Contents

${srtSection}

Analyze these transcripts to find buildable projects. Create progress.json and project-findings.json in the course root folder (${course.path}/).`;
}

/**
 * Build the prompt for generating a single project
 * Uses the project-generator skill for implementation
 */
export function buildGeneratorPrompt(
  course: Course,
  project: ProjectEntry,
  relevantSrts: SrtFile[]
): string {
  const srtSection = relevantSrts
    .map((srt) => `=== ${srt.filename} ===\n${srt.content}`)
    .join('\n\n');

  const outputPath = `${course.path}/CODE/__CC_Projects/${project.synthesized_name}`;

  return `Generate project ${project.synthesized_name} from the following transcripts.

## Project Specification
- **Name**: ${project.synthesized_name}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech_stack.join(', ')}
- **Complexity**: ${project.complexity}
- **Output Path**: ${outputPath}

## Source Transcripts

${srtSection}

Create this project in ${outputPath}/ with complete documentation and working source code.`;
}

/**
 * System prompt append for discovery phase
 * Minimal - let the skill handle the details
 */
export function getDiscoverySystemPrompt(): string {
  return `You have access to the project-discovery skill which knows how to analyze course transcripts and create project manifests. Use it when asked to discover or analyze projects.`;
}

/**
 * System prompt append for generation phase
 * Minimal - let the skill handle the details
 */
export function getGeneratorSystemPrompt(): string {
  return `You have access to the project-generator skill which knows how to create complete working projects from transcripts. Use it when asked to generate or build projects.`;
}
