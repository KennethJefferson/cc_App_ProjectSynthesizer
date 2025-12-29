/**
 * Claude Agent SDK client wrapper
 *
 * Uses three separate skills:
 * - project-discovery: Analyzes SRTs and outputs manifest
 * - project-architect: Extracts architecture spec for large projects
 * - project-generator: Generates projects from manifest entries
 *
 * For large projects (>LARGE_PROJECT_THRESHOLD SRTs), uses chunked generation:
 * 1. Architect extracts full architecture spec
 * 2. Generator runs on chunks with spec as context
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync } from 'fs';
import { join } from 'path';
import type {
  Course,
  SrtFile,
  DiscoveryResult,
  GeneratedProject,
  ProjectEntry,
  ArchitectureSpec,
  ArchitectResult,
  SrtChunk,
} from '../types';
import {
  buildDiscoveryPrompt,
  buildGeneratorPrompt,
  buildArchitectPrompt,
  buildChunkedGeneratorPrompt,
  getDiscoverySystemPrompt,
  getGeneratorSystemPrompt,
  getArchitectSystemPrompt,
  getChunkedGeneratorSystemPrompt,
  LARGE_PROJECT_THRESHOLD,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
} from './prompts';
import {
  parseDiscoveryResult,
  parseGeneratorResult,
  parseArchitectResult,
} from './result-parser';
import { readJsonFile } from '../utils/file';
import type { SynthEventEmitter } from '../worker/events';

/**
 * Extract basename from a path (handles both / and \ separators)
 */
function getBasename(filepath: string): string {
  return filepath.split(/[/\\]/).pop() || filepath;
}

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

  // Phase 1: Discovery (check for existing manifest first)
  let discoveryResult: DiscoveryResult;
  const existingManifestPath = join(course.path, 'project-findings.json');

  if (existsSync(existingManifestPath)) {
    // Use existing manifest - skip discovery phase
    if (process.env.DEBUG) {
      console.log(`[Discovery] Using existing manifest: ${existingManifestPath}`);
    }
    discoveryResult = parseDiscoveryResult('', course.path);
  } else {
    // Run discovery - pass file paths, not content (agent reads files directly)
    const srtFilePaths = srtContents.map(srt => srt.filename);
    discoveryResult = await runDiscoveryAgent(course, srtFilePaths);
  }

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
      // Check if this is a large project requiring chunked generation
      const isLargeProject = project.source_srts.length > LARGE_PROJECT_THRESHOLD;

      let result: GeneratedProject;
      if (isLargeProject) {
        if (process.env.DEBUG) {
          console.log(`[Generator] Large project detected: ${project.synthesized_name} (${project.source_srts.length} SRTs)`);
        }
        result = await runLargeProjectGeneration(course, project, srtContents);
      } else {
        result = await runGeneratorAgent(course, project, srtContents);
      }

      // Run GitHub integration after successful generation
      await runGitHubIntegration(result, workerId, eventEmitter);
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
 * Note: We pass file paths, not content - agent reads files directly
 */
async function runDiscoveryAgent(
  course: Course,
  srtFilePaths: string[]
): Promise<DiscoveryResult> {
  const prompt = buildDiscoveryPrompt(course, srtFilePaths);

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: 'acceptEdits',
        settingSources: ['user'],
        allowedTools: ['Skill', 'Read', 'Write', 'Glob', 'Grep', 'Edit', 'Bash'],
        systemPrompt: getDiscoverySystemPrompt(),
      },
    });

    let finalResultText: string | null = null;
    let lastError: string | null = null;

    for await (const message of result) {
      // Debug: log all messages
      if (process.env.DEBUG) {
        console.log('[Discovery] Message:', JSON.stringify(message, null, 2).slice(0, 500));
      }

      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResultText = message.result;
          if (process.env.DEBUG) {
            console.log('[Discovery] Final result:', finalResultText?.slice(0, 1000));
          }
        } else {
          lastError = (message as any).errors?.join(', ') || 'Unknown error';
          if (process.env.DEBUG) {
            console.log('[Discovery] Error:', lastError);
          }
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
  // Compare basenames since manifest may have just filename while scanner has relative paths
  const relevantSrts = allSrtContents.filter(srt => {
    const srtBasename = getBasename(srt.filename);
    return project.source_srts.some(sourceSrt =>
      getBasename(sourceSrt) === srtBasename
    );
  });

  if (process.env.DEBUG) {
    console.log(`[Generator] Project: ${project.synthesized_name}`);
    console.log(`[Generator] Project source_srts (${project.source_srts.length}):`, project.source_srts.slice(0, 5));
    console.log(`[Generator] All SRT filenames (${allSrtContents.length}):`, allSrtContents.map(s => s.filename).slice(0, 5));
    console.log(`[Generator] Matched SRTs: ${relevantSrts.length}`);
  }

  const prompt = buildGeneratorPrompt(course, project, relevantSrts);

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: 'acceptEdits',
        settingSources: ['user'],
        allowedTools: ['Skill', 'Read', 'Write', 'Glob', 'Grep', 'Edit', 'Bash'],
        systemPrompt: getGeneratorSystemPrompt(),
      },
    });

    let finalResultText: string | null = null;
    let lastError: string | null = null;

    for await (const message of result) {
      // Debug: log all messages for generator
      if (process.env.DEBUG) {
        console.log('[Generator] Message:', JSON.stringify(message, null, 2).slice(0, 500));
      }

      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResultText = message.result;
          if (process.env.DEBUG) {
            console.log('[Generator] Final result:', finalResultText?.slice(0, 1000));
          }
        } else {
          lastError = (message as any).errors?.join(', ') || 'Unknown error';
          if (process.env.DEBUG) {
            console.log('[Generator] Error:', lastError);
          }
        }
      }
    }

    // Always check filesystem first, then fall back to text parsing
    return parseGeneratorResult(
      finalResultText || '',
      project.synthesized_name,
      course.path
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Even on error, check if project was created on disk
    return parseGeneratorResult('', project.synthesized_name, course.path);
  }
}

/**
 * Run large project generation with architect + chunked generator
 *
 * Flow:
 * 1. Check for existing architecture spec
 * 2. If not found, run architect to extract spec
 * 3. Split SRTs into chunks
 * 4. Run generator on each chunk with spec as context
 * 5. Combine results
 */
async function runLargeProjectGeneration(
  course: Course,
  project: ProjectEntry,
  allSrtContents: SrtFile[]
): Promise<GeneratedProject> {
  const projectName = project.synthesized_name;

  // Filter to relevant SRTs
  // Compare basenames since manifest may have just filename while scanner has relative paths
  const relevantSrts = allSrtContents.filter((srt) => {
    const srtBasename = getBasename(srt.filename);
    return project.source_srts.some(sourceSrt =>
      getBasename(sourceSrt) === srtBasename
    );
  });

  if (process.env.DEBUG) {
    console.log(`[LargeProject] Starting: ${projectName}`);
    console.log(`[LargeProject] Relevant SRTs: ${relevantSrts.length}`);
  }

  // Phase 1: Get or create architecture spec
  let architectureSpec: ArchitectureSpec;
  const existingSpecPath = join(course.path, `architecture-${projectName}.json`);

  if (existsSync(existingSpecPath)) {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Using existing spec: ${existingSpecPath}`);
    }
    const specResult = parseArchitectResult('', projectName, course.path);
    if (!specResult.success || !specResult.spec) {
      return {
        project_name: projectName,
        output_path: '',
        files_created: [],
        status: 'failed',
        errors: ['Failed to load existing architecture spec'],
      };
    }
    architectureSpec = specResult.spec;
  } else {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Running architect phase`);
    }
    const architectResult = await runArchitectAgent(
      course,
      project,
      project.source_srts
    );
    if (!architectResult.success || !architectResult.spec) {
      return {
        project_name: projectName,
        output_path: '',
        files_created: [],
        status: 'failed',
        errors: [architectResult.error || 'Architect phase failed'],
      };
    }
    architectureSpec = architectResult.spec;
  }

  if (process.env.DEBUG) {
    console.log(`[LargeProject] Architecture spec loaded:`);
    console.log(`  - Files: ${architectureSpec.file_structure.length}`);
    console.log(`  - Models: ${architectureSpec.data_models.length}`);
    console.log(`  - Routes: ${architectureSpec.api_routes.length}`);
    console.log(`  - Components: ${architectureSpec.components.length}`);
  }

  // Phase 2: Create chunks and generate
  const chunks = createSrtChunks(relevantSrts);

  if (process.env.DEBUG) {
    console.log(`[LargeProject] Created ${chunks.length} chunks`);
  }

  const allFilesCreated: string[] = [];
  const allErrors: string[] = [];

  for (const chunk of chunks) {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Processing chunk ${chunk.index + 1}/${chunk.total}`);
    }

    try {
      const chunkResult = await runChunkedGenerator(
        course,
        project,
        architectureSpec,
        chunk,
        allFilesCreated
      );

      if (chunkResult.files_created.length > 0) {
        allFilesCreated.push(...chunkResult.files_created);
      }
      if (chunkResult.errors.length > 0) {
        allErrors.push(...chunkResult.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      allErrors.push(`Chunk ${chunk.index + 1} error: ${errorMsg}`);
    }
  }

  // Determine final status
  const projectPath = join(course.path, 'CODE', '__CC_Projects', projectName);
  const projectExists = existsSync(projectPath);

  return {
    project_name: projectName,
    output_path: projectExists ? projectPath : '',
    files_created: allFilesCreated,
    status:
      allFilesCreated.length > 0
        ? allErrors.length > 0
          ? 'partial'
          : 'success'
        : 'failed',
    errors: allErrors,
  };
}

/**
 * Run the architect skill to extract architecture spec
 */
async function runArchitectAgent(
  course: Course,
  project: ProjectEntry,
  srtFilePaths: string[]
): Promise<ArchitectResult> {
  const prompt = buildArchitectPrompt(course, project, srtFilePaths);

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: 'acceptEdits',
        settingSources: ['user'],
        allowedTools: ['Skill', 'Read', 'Write', 'Glob', 'Grep'],
        systemPrompt: getArchitectSystemPrompt(),
      },
    });

    let finalResultText: string | null = null;
    let lastError: string | null = null;

    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log(
          '[Architect] Message:',
          JSON.stringify(message, null, 2).slice(0, 500)
        );
      }

      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResultText = message.result;
        } else {
          lastError = (message as any).errors?.join(', ') || 'Unknown error';
        }
      }
    }

    return parseArchitectResult(
      finalResultText || '',
      project.synthesized_name,
      course.path
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      spec: null,
      error: `Architect error: ${errorMsg}`,
      spec_path: null,
    };
  }
}

/**
 * Run chunked generator for a single chunk
 */
async function runChunkedGenerator(
  course: Course,
  project: ProjectEntry,
  architectureSpec: ArchitectureSpec,
  chunk: SrtChunk,
  previouslyGeneratedFiles: string[]
): Promise<GeneratedProject> {
  const prompt = buildChunkedGeneratorPrompt(
    course,
    project,
    architectureSpec,
    chunk.srts,
    chunk.index,
    chunk.total,
    previouslyGeneratedFiles
  );

  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: 'acceptEdits',
        settingSources: ['user'],
        allowedTools: ['Skill', 'Read', 'Write', 'Glob', 'Grep', 'Edit', 'Bash'],
        systemPrompt: getChunkedGeneratorSystemPrompt(),
      },
    });

    let finalResultText: string | null = null;

    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log(
          `[ChunkedGen ${chunk.index + 1}] Message:`,
          JSON.stringify(message, null, 2).slice(0, 500)
        );
      }

      if (message.type === 'result' && message.subtype === 'success') {
        finalResultText = message.result;
      }
    }

    return parseGeneratorResult(
      finalResultText || '',
      project.synthesized_name,
      course.path
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return {
      project_name: project.synthesized_name,
      output_path: '',
      files_created: [],
      status: 'failed',
      errors: [`Chunk ${chunk.index + 1} error: ${errorMsg}`],
    };
  }
}

/**
 * Convert project name to GitHub repo name
 * "Project_ReactTodoApp" → "ccg_ReactTodoApp"
 */
function convertToRepoName(projectName: string): string {
  const stripped = projectName.replace(/^Project_/, '');
  return `ccg_${stripped}`;
}

/**
 * Execute a shell command and return result
 */
async function execCommand(
  command: string,
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(['sh', '-c', command], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { success: exitCode === 0, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run GitHub integration after project generation
 * - Check if gh CLI is installed and authenticated
 * - Initialize git repo, commit, create GitHub repo, and push
 */
export async function runGitHubIntegration(
  generatedProject: GeneratedProject,
  workerId?: number,
  eventEmitter?: SynthEventEmitter
): Promise<void> {
  // Skip if project failed to generate or has no output path
  if (generatedProject.status === 'failed' || !generatedProject.output_path) {
    return;
  }

  const projectPath = generatedProject.output_path;
  const repoName = convertToRepoName(generatedProject.project_name);

  // Emit start event
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: 'worker:github:start',
      workerId,
      projectName: generatedProject.project_name,
    });
  }

  // Check if gh CLI is installed
  const ghVersionResult = await execCommand('gh --version');
  if (!ghVersionResult.success) {
    const reason = 'GitHub CLI (gh) not installed';
    console.log('\x1b[33m[GitHub] ' + reason + ' - skipping repo creation.\x1b[0m');
    generatedProject.github = { status: 'skipped', error: reason };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({ type: 'worker:github:skipped', workerId, reason });
    }
    return;
  }

  // Check if user is authenticated
  const authResult = await execCommand('gh auth status');
  if (!authResult.success) {
    const reason = 'Not logged in to GitHub CLI';
    console.log('\x1b[33m[GitHub] ' + reason + " - skipping repo creation. Run 'gh auth login' to enable.\x1b[0m");
    generatedProject.github = { status: 'skipped', error: reason };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({ type: 'worker:github:skipped', workerId, reason });
    }
    return;
  }

  try {
    // Initialize git repo
    await execCommand('git init', projectPath);

    // Add all files
    await execCommand('git add .', projectPath);

    // Create initial commit
    await execCommand('git commit -m "Init commit"', projectPath);

    // Create GitHub repo and push
    const createResult = await execCommand(
      `gh repo create "${repoName}" --public --source . --push --description "Auto-generated from course transcripts by CCProjectSynth"`,
      projectPath
    );

    if (!createResult.success) {
      const error = createResult.stderr || 'Failed to create GitHub repo';
      generatedProject.github = { status: 'failed', error };
      if (workerId !== undefined && eventEmitter) {
        eventEmitter.emit({
          type: 'worker:github:failed',
          workerId,
          projectName: generatedProject.project_name,
          error,
        });
      }
      return;
    }

    // Extract repo URL from output or construct it
    const repoUrlMatch = createResult.stdout.match(/https:\/\/github\.com\/[^\s]+/);
    const repoUrl = repoUrlMatch ? repoUrlMatch[0] : `https://github.com/${repoName}`;

    generatedProject.github = { status: 'pushed', repo_url: repoUrl };

    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: 'worker:github:complete',
        workerId,
        projectName: generatedProject.project_name,
        repoUrl,
      });
    }

    if (process.env.DEBUG) {
      console.log(`[GitHub] Successfully created repo: ${repoUrl}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    generatedProject.github = { status: 'failed', error: errorMsg };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: 'worker:github:failed',
        workerId,
        projectName: generatedProject.project_name,
        error: errorMsg,
      });
    }
  }
}

/**
 * Create SRT chunks with overlap for large project generation
 */
function createSrtChunks(srts: SrtFile[]): SrtChunk[] {
  const chunks: SrtChunk[] = [];
  const totalChunks = Math.ceil(srts.length / CHUNK_SIZE);

  for (let i = 0; i < srts.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunkSrts = srts.slice(i, i + CHUNK_SIZE);

    // Stop if this chunk would be too small (less than half chunk size)
    if (chunkSrts.length < CHUNK_SIZE / 2 && chunks.length > 0) {
      // Add remaining to last chunk instead
      chunks[chunks.length - 1].srts.push(
        ...chunkSrts.filter(
          (srt) => !chunks[chunks.length - 1].srts.includes(srt)
        )
      );
      break;
    }

    const overlapFiles =
      i > 0
        ? srts.slice(Math.max(0, i - CHUNK_OVERLAP), i).map((s) => s.filename)
        : [];

    chunks.push({
      index: chunks.length,
      total: totalChunks,
      srts: chunkSrts,
      overlap_from_previous: overlapFiles,
    });
  }

  // Update total count in all chunks
  chunks.forEach((chunk) => {
    chunk.total = chunks.length;
  });

  return chunks;
}
