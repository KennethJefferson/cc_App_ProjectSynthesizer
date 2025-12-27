/**
 * Prompt construction for Claude agents
 * 
 * Separate prompts for:
 * - Discovery phase (project-discovery skill)
 * - Generation phase (project-generator skill)
 */

import type { Course, SrtFile, ProjectEntry } from '../types';

/**
 * Build the prompt for the discovery phase
 */
export function buildDiscoveryPrompt(course: Course, srtContents: SrtFile[]): string {
  const srtSection = srtContents
    .map(
      (srt) => `
=== ${srt.filename} ===
${srt.content}
`
    )
    .join('\n');

  return `You are analyzing a course for project discovery using the project-discovery skill.

## Course Information

COURSE_PATH: ${course.path}
HAS_SUBFOLDERS: ${course.hasSubfolders}
TOTAL_SRT_FILES: ${srtContents.length}

## SRT File Contents

${srtSection}

## Instructions

Follow the project-discovery skill workflow:

1. **Create progress.json** in the COURSE ROOT with status "started"
   Path: ${course.path}/progress.json

2. **Analyze SRT content sequentially** to identify projects:
   - Look for project start indicators ("let's build", "we'll create", etc.)
   - Track project continuations (same app being extended)
   - Note project endings ("that completes", moving to different topic)
   - Skip non-project content (intros, conclusions, pure theory)

3. **Create project-findings.json** in the COURSE ROOT:
   Path: ${course.path}/project-findings.json

4. **Output the manifest JSON** at the end of your response

## CRITICAL: File Location Rules

- ONLY create files at the EXACT paths specified above
- The COURSE ROOT is: ${course.path}
- DO NOT create any CODE folders during discovery
- DO NOT create any folders inside module subfolders
- All files go in the COURSE ROOT directory only

## Output Format

After completing discovery, output the manifest in this exact JSON format:

\`\`\`json
{
  "course_path": "${course.path}",
  "discovered_at": "[ISO timestamp]",
  "discovery_version": "1.0",
  "has_projects": true|false,
  "projects": [
    {
      "id": "proj_001",
      "name": "SimpleName",
      "synthesized_name": "Project_FullName",
      "description": "Description of the project",
      "source_srts": ["file1.srt", "file2.srt"],
      "tech_stack": ["Tech1", "Tech2"],
      "complexity": "beginner|intermediate|advanced",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    }
  ],
  "skipped_srts": ["intro.srt", "conclusion.srt"],
  "no_project_reason": null
}
\`\`\`

Begin discovery now.`;
}

/**
 * Build the prompt for generating a single project
 */
export function buildGeneratorPrompt(
  course: Course,
  project: ProjectEntry,
  relevantSrts: SrtFile[]
): string {
  const srtSection = relevantSrts
    .map(
      (srt) => `
=== ${srt.filename} ===
${srt.content}
`
    )
    .join('\n');

  const outputPath = `${course.path}/CODE/__CC_Projects/${project.synthesized_name}`;

  return `You are generating a project using the project-generator skill.

## Project Specification

- **ID**: ${project.id}
- **Name**: ${project.name}
- **Synthesized Name**: ${project.synthesized_name}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech_stack.join(', ')}
- **Complexity**: ${project.complexity}
- **Output Path**: ${outputPath}

## Source Transcripts

${srtSection}

## CRITICAL: Output Location

- COURSE ROOT: ${course.path}
- PROJECT OUTPUT: ${outputPath}
- ALL files MUST go inside: ${outputPath}
- DO NOT create CODE folders anywhere else
- DO NOT create folders in module subfolders (e.g., "01 - Introduction/CODE" is WRONG)

## Instructions

Follow the project-generator skill workflow:

1. **Create project directory**: ${outputPath}
   - This is the ONLY location for project files

2. **Generate required documentation files** (inside ${outputPath}):
   - CLAUDE.md (project context for future Claude sessions)
   - README.md (user documentation)
   - USAGE.md (detailed usage guide)
   - CHANGELOG.md (version history - APPEND ONLY if exists!)

3. **Generate configuration files** based on tech stack (inside ${outputPath}):
   - package.json, tsconfig.json, requirements.txt, etc.

4. **Generate all source code** (inside ${outputPath}):
   - WORKING code only (no TODOs, no placeholders)
   - Follow patterns from transcripts
   - Include proper error handling
   - All imports must be valid

5. **Update project-findings.json** in COURSE ROOT:
   - Path: ${course.path}/project-findings.json
   - Set generation_status to "complete"
   - Set generated_at to current timestamp
   - Set output_path to "${outputPath}"

## Output Format

After generating, output result in this exact JSON format:

\`\`\`json
{
  "project_name": "${project.synthesized_name}",
  "output_path": "${outputPath}",
  "files_created": ["CLAUDE.md", "README.md", "..."],
  "status": "success|partial|failed",
  "errors": []
}
\`\`\`

Begin generation now.`;
}

/**
 * System prompt append for discovery phase
 */
export function getDiscoverySystemPrompt(): string {
  return `
You are a project discovery specialist. Your task is to analyze course transcripts and identify teachable projects.

Key responsibilities:
1. Accurately identify project boundaries (start, continue, end)
2. Skip non-project content (intros, theory, conclusions)
3. Create detailed manifest with accurate tech stack detection
4. Generate appropriate synthesized names (Project_XxxYyy format)

Always:
- Read SRTs in order (sequence matters for continuity)
- Combine multi-part projects into single entries
- Be specific in descriptions
- Detect tech stack from code mentions in transcripts
`;
}

/**
 * System prompt append for generation phase
 */
export function getGeneratorSystemPrompt(): string {
  return `
You are a project generation specialist. Your task is to create complete, working code projects from transcript analysis.

Key responsibilities:
1. Generate WORKING code (no placeholders, no TODOs)
2. Follow patterns shown in transcripts
3. Create comprehensive documentation
4. Use proper project structure for the tech stack

Never:
- Leave empty function bodies
- Use placeholder comments
- Skip error handling
- Forget configuration files

Always:
- Check if CHANGELOG.md exists before writing (append only)
- Include all features discussed in transcripts
- Make code runnable after dependency installation
`;
}
