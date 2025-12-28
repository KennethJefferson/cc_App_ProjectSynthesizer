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

import type { Course, SrtFile, ProjectEntry, ArchitectureSpec } from '../types';

/**
 * Build the prompt for the discovery phase
 * Does NOT include SRT content - agent reads files directly to manage context
 */
export function buildDiscoveryPrompt(course: Course, srtFilePaths: string[]): string {
  // Group SRT files by folder for better organization
  const filesByFolder = new Map<string, string[]>();
  for (const filepath of srtFilePaths) {
    const parts = filepath.split(/[/\\]/);
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    if (!filesByFolder.has(folder)) {
      filesByFolder.set(folder, []);
    }
    filesByFolder.get(folder)!.push(parts[parts.length - 1]);
  }

  // Create a structured overview
  const folderOverview = Array.from(filesByFolder.entries())
    .map(([folder, files]) => `  - ${folder}/ (${files.length} files)`)
    .join('\n');

  return `Discover projects in this course by analyzing the transcript files.

## Course Information
- **Course Path**: ${course.path}
- **Course Name**: ${course.name}
- **Total SRT Files**: ${srtFilePaths.length}
- **Has Subfolders**: ${course.hasSubfolders}

## SRT File Structure
${folderOverview}

## Instructions

1. Use Glob to find all .srt files: \`**/*.srt\`
2. Read representative SRT files from each section to understand the course content
3. For large courses (50+ SRTs), sample strategically rather than reading all files
4. Identify buildable code projects taught in the course
5. Create these files in the course root (${course.path}/):
   - progress.json with status tracking
   - project-findings.json with discovered projects

Focus on finding hands-on coding projects, not just theoretical content.`;
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

/**
 * Threshold for triggering architecture extraction (number of SRTs)
 * Projects with more source SRTs than this will use the architect phase
 */
export const LARGE_PROJECT_THRESHOLD = 15;

/**
 * Chunk size for large project generation (number of SRTs per chunk)
 */
export const CHUNK_SIZE = 10;

/**
 * Overlap between chunks (number of SRTs)
 */
export const CHUNK_OVERLAP = 2;

/**
 * Build the prompt for the architecture extraction phase
 * Used for large projects before chunked generation
 */
export function buildArchitectPrompt(
  course: Course,
  project: ProjectEntry,
  srtFilePaths: string[]
): string {
  return `Extract the architecture specification for project "${project.synthesized_name}" by analyzing the source transcripts.

## Project Information
- **Project Name**: ${project.name}
- **Synthesized Name**: ${project.synthesized_name}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech_stack.join(', ')}
- **Complexity**: ${project.complexity}
- **Course Path**: ${course.path}

## Source Transcripts (${srtFilePaths.length} files)
${srtFilePaths.map(f => `- ${f}`).join('\n')}

## Instructions

1. Read ALL source transcript files listed above
2. Extract the complete architecture by identifying:
   - All files that need to be created (with their purpose)
   - Data models/schemas (database tables, types)
   - API routes/endpoints (method, path, purpose)
   - UI components (pages, layouts, reusable components)
   - Dependencies (npm packages with versions if mentioned)
   - Environment variables needed
   - Key implementation patterns used in the teaching

3. Create an architecture spec file at:
   \`${course.path}/architecture-${project.synthesized_name}.json\`

4. The spec should be detailed enough that a generator can build each file
   WITHOUT needing the full transcript context

## Output Format

Write the JSON file with this structure:
\`\`\`json
{
  "project_name": "${project.name}",
  "synthesized_name": "${project.synthesized_name}",
  "description": "...",
  "tech_stack": [...],
  "dependencies": { "package": "version", ... },
  "dev_dependencies": { "package": "version", ... },
  "file_structure": [
    { "path": "src/models/User.ts", "purpose": "User data model", "exports": ["User", "UserSchema"] }
  ],
  "data_models": [
    { "name": "User", "orm_type": "prisma", "fields": [...], "relations": [...] }
  ],
  "api_routes": [
    { "method": "POST", "path": "/api/auth/login", "description": "...", "request_body": "...", "response": "..." }
  ],
  "components": [
    { "name": "LoginForm", "type": "component", "props": [...], "dependencies": [...] }
  ],
  "key_patterns": ["Repository pattern for data access", "JWT for authentication", ...],
  "build_order": ["prisma/schema.prisma", "src/lib/db.ts", "src/models/...", ...],
  "env_vars": ["DATABASE_URL", "JWT_SECRET", ...],
  "implementation_notes": ["Uses App Router", "Server actions for mutations", ...]
}
\`\`\`

Focus on extracting COMPLETE architecture - this spec will guide chunked code generation.`;
}

/**
 * Build the prompt for chunked generation (with architecture spec)
 */
export function buildChunkedGeneratorPrompt(
  course: Course,
  project: ProjectEntry,
  architectureSpec: ArchitectureSpec,
  chunkSrts: SrtFile[],
  chunkIndex: number,
  totalChunks: number,
  previouslyGeneratedFiles: string[]
): string {
  const srtSection = chunkSrts
    .map((srt) => `=== ${srt.filename} ===\n${srt.content}`)
    .join('\n\n');

  const outputPath = `${course.path}/CODE/__CC_Projects/${project.synthesized_name}`;

  const specSummary = `
## Architecture Spec (Reference)
- **Files to create**: ${architectureSpec.file_structure.length} total
- **Data models**: ${architectureSpec.data_models.map(m => m.name).join(', ') || 'None'}
- **API routes**: ${architectureSpec.api_routes.length} endpoints
- **Components**: ${architectureSpec.components.map(c => c.name).join(', ') || 'None'}
- **Key patterns**: ${architectureSpec.key_patterns.slice(0, 3).join(', ')}
- **Build order**: ${architectureSpec.build_order.slice(0, 5).join(' → ')}...

### Files Already Generated (${previouslyGeneratedFiles.length})
${previouslyGeneratedFiles.length > 0 ? previouslyGeneratedFiles.map(f => `- ${f}`).join('\n') : 'None yet - this is the first chunk'}

### Remaining Files to Generate
${architectureSpec.file_structure
  .filter(f => !previouslyGeneratedFiles.includes(f.path))
  .slice(0, 20)
  .map(f => `- ${f.path}: ${f.purpose}`)
  .join('\n')}
${architectureSpec.file_structure.length - previouslyGeneratedFiles.length > 20 ? `\n... and ${architectureSpec.file_structure.length - previouslyGeneratedFiles.length - 20} more` : ''}
`;

  return `Generate code for project "${project.synthesized_name}" - Chunk ${chunkIndex + 1} of ${totalChunks}.

## Project Information
- **Name**: ${project.synthesized_name}
- **Output Path**: ${outputPath}
- **Tech Stack**: ${project.tech_stack.join(', ')}

${specSummary}

## Transcript Chunk ${chunkIndex + 1}/${totalChunks}

${srtSection}

## Instructions

1. Read the transcript chunk above
2. Identify which files from the architecture spec are covered in THIS chunk
3. Generate those files following the build order where possible
4. Use the architecture spec for consistent naming, patterns, and structure
5. If a file depends on one not yet generated, create a stub/interface

Write files to: ${outputPath}/

IMPORTANT:
- Only generate files that have implementation details in THIS chunk
- Follow the architecture spec for consistency with other chunks
- Include proper imports (even for files not yet created)
- Mark any TODOs for details that will come in later chunks`;
}

/**
 * System prompt for architecture extraction phase
 */
export function getArchitectSystemPrompt(): string {
  return `You are an expert software architect. Your task is to analyze course transcripts and extract a complete, detailed architecture specification.

Focus on:
- Identifying ALL files that need to be created
- Understanding data models and their relationships
- Mapping out API endpoints and their contracts
- Identifying reusable components
- Noting implementation patterns and best practices taught

The architecture spec you produce will guide code generation in chunks, so it must be comprehensive enough that each chunk can be generated independently while maintaining consistency.`;
}

/**
 * System prompt for chunked generation phase
 */
export function getChunkedGeneratorSystemPrompt(): string {
  return `You are implementing a project based on an architecture specification and transcript chunks.

Key rules:
- Follow the architecture spec for file structure and naming
- Only implement code that has details in the current chunk
- Create proper imports even for files not yet generated
- Maintain consistency with the established patterns
- Add TODO comments for parts that will be completed in later chunks`;
}
