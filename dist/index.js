#!/usr/bin/env bun
// @bun
var __require = import.meta.require;

// src/cli/args.ts
function parseArgs(argv) {
  const args = {
    input: null,
    recursive: false,
    concurrency: 5,
    scanWorkers: 3,
    help: false,
    version: false
  };
  for (let i = 0;i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-i":
      case "--input":
        args.input = argv[++i];
        break;
      case "-r":
      case "--recursive":
        args.recursive = true;
        break;
      case "-c":
      case "--concurrency":
        const concurrency = parseInt(argv[++i], 10);
        if (!isNaN(concurrency) && concurrency > 0) {
          args.concurrency = concurrency;
        }
        break;
      case "-s":
      case "--scan-workers":
        const scanWorkers = parseInt(argv[++i], 10);
        if (!isNaN(scanWorkers) && scanWorkers > 0) {
          args.scanWorkers = scanWorkers;
        }
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      default:
        if (!arg.startsWith("-") && !args.input) {
          args.input = arg;
        }
        break;
    }
  }
  if (!args.recursive) {
    args.scanWorkers = 1;
  }
  return args;
}
function printHelp() {
  console.log(`
CCProjectSynth - Synthesize projects from course transcripts

USAGE:
  bun start -- [OPTIONS]
  ccprojectsynth [OPTIONS]

OPTIONS:
  -i, --input <path>       Input directory to scan for courses (required)
  -r, --recursive          Recursively scan for courses in subdirectories
  -c, --concurrency <n>    Number of concurrent course workers (default: 5)
  -s, --scan-workers <n>   Number of parallel scan workers (default: 3)
                           Only effective with -r flag
  -h, --help               Show this help message
  -v, --version            Show version

EXAMPLES:
  # Process a single course folder
  bun start -- -i "/path/to/course"

  # Process all courses in a directory recursively
  bun start -- -i "/path/to/courses" -r

  # Process with 10 concurrent workers
  bun start -- -i "/path/to/courses" -r -c 10

  # Process with custom concurrency and scan workers
  bun start -- -i "/path/to/courses" -r -c 10 -s 5

GRACEFUL SHUTDOWN:
  Press Ctrl+C once to stop accepting new courses and wait for
  current workers to complete their courses.
  
  Press Ctrl+C twice to force immediate exit (may leave courses
  in incomplete state).

OUTPUT:
  Each course will have:
  - progress.json: Status tracking file
  - CODE/__CC_Projects/: Generated project folders
  - error.log: In input directory, logs any failures
`);
}
function printVersion() {
  console.log("CCProjectSynth v1.0.0");
}

// src/cli/commands.ts
import { resolve } from "path";
import { existsSync as existsSync7 } from "fs";

// src/scanner/course-scanner.ts
import { join as join4 } from "path";
import { readdirSync as readdirSync3, statSync as statSync3, existsSync as existsSync4 } from "fs";

// src/utils/file.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";
function readJsonFile(path) {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function readProgressFile(coursePath) {
  const progressPath = join(coursePath, "progress.json");
  return readJsonFile(progressPath);
}
function deleteDirectory(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}
function listDirectories(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }
  const entries = readdirSync(dirPath);
  const dirs = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      dirs.push(entry);
    }
  }
  return dirs.sort();
}

// src/scanner/state-detector.ts
import { existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
function detectCourseState(coursePath) {
  const progressPath = join2(coursePath, "progress.json");
  const ccProjectsPath = join2(coursePath, "CODE", "__CC_Projects");
  const hasProjects = existsSync2(ccProjectsPath);
  if (existsSync2(progressPath)) {
    const progress = readProgressFile(coursePath);
    if (progress) {
      if (progress.status === "complete" || progress.status === "completed") {
        if (hasProjects) {
          return "skipped";
        }
        return "pending";
      } else {
        cleanupIncompleteCourse(coursePath);
        return "pending";
      }
    } else {
      cleanupIncompleteCourse(coursePath);
      return "pending";
    }
  }
  if (hasProjects) {
    return "skipped";
  }
  return "pending";
}
function cleanupIncompleteCourse(coursePath) {
  const ccProjectsPath = join2(coursePath, "CODE", "__CC_Projects");
  if (existsSync2(ccProjectsPath)) {
    try {
      deleteDirectory(ccProjectsPath);
    } catch (_error) {}
  }
}

// src/scanner/srt-scanner.ts
import { join as join3 } from "path";
import { readdirSync as readdirSync2, statSync as statSync2, existsSync as existsSync3, readFileSync as readFileSync2 } from "fs";
function scanCourseSrts(coursePath) {
  const srtFiles = [];
  scanDirectory(coursePath, "", srtFiles);
  return srtFiles.sort(naturalSort);
}
function scanDirectory(basePath, relativePath, srtFiles) {
  const currentPath = relativePath ? join3(basePath, relativePath) : basePath;
  if (!existsSync3(currentPath)) {
    return;
  }
  const entries = readdirSync2(currentPath);
  for (const entry of entries) {
    if (entry === "CODE" || entry === "__CC_Projects" || entry.startsWith(".")) {
      continue;
    }
    const entryPath = join3(currentPath, entry);
    const relativeEntryPath = relativePath ? `${relativePath}/${entry}` : entry;
    const stat = statSync2(entryPath);
    if (stat.isFile() && entry.toLowerCase().endsWith(".srt")) {
      srtFiles.push(relativeEntryPath);
    } else if (stat.isDirectory()) {
      scanDirectory(basePath, relativeEntryPath, srtFiles);
    }
  }
}
function naturalSort(a, b) {
  const re = /(\d+)|(\D+)/g;
  const aParts = a.match(re) || [];
  const bParts = b.match(re) || [];
  for (let i = 0;i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
      if (diff !== 0)
        return diff;
    } else {
      const diff = aPart.localeCompare(bPart);
      if (diff !== 0)
        return diff;
    }
  }
  return aParts.length - bParts.length;
}
function loadSrtContent(coursePath, srtFile) {
  const fullPath = join3(coursePath, srtFile);
  let content = "";
  try {
    content = readFileSync2(fullPath, "utf-8");
  } catch (error) {
    content = `[Error reading file: ${error}]`;
  }
  return {
    filename: srtFile,
    content
  };
}
function loadAllSrtContents(coursePath, srtFiles) {
  return srtFiles.map((file) => loadSrtContent(coursePath, file));
}

// src/scanner/course-scanner.ts
function containsSrtFilesRecursive(dirPath) {
  if (!existsSync4(dirPath))
    return false;
  const entries = readdirSync3(dirPath);
  for (const entry of entries) {
    if (entry === "CODE" || entry === "__CC_Projects" || entry.startsWith(".")) {
      continue;
    }
    const entryPath = join4(dirPath, entry);
    const stat = statSync3(entryPath);
    if (stat.isFile() && entry.toLowerCase().endsWith(".srt")) {
      return true;
    }
    if (stat.isDirectory()) {
      if (containsSrtFilesRecursive(entryPath)) {
        return true;
      }
    }
  }
  return false;
}
function scanForCourses(inputDir, recursive) {
  const courses = [];
  if (!existsSync4(inputDir)) {
    return courses;
  }
  if (recursive) {
    const subdirs = listDirectories(inputDir);
    for (const subdir of subdirs) {
      if (subdir === "CODE" || subdir === "__CC_Projects" || subdir.startsWith(".")) {
        continue;
      }
      const subdirPath = join4(inputDir, subdir);
      if (containsSrtFilesRecursive(subdirPath)) {
        const course = buildCourse(subdirPath);
        if (course) {
          courses.push(course);
        }
      }
    }
  } else {
    if (containsSrtFilesRecursive(inputDir)) {
      const course = buildCourse(inputDir);
      if (course) {
        courses.push(course);
      }
    } else {
      const subdirs = listDirectories(inputDir);
      for (const subdir of subdirs) {
        if (subdir === "CODE" || subdir === "__CC_Projects" || subdir.startsWith(".")) {
          continue;
        }
        const subdirPath = join4(inputDir, subdir);
        if (containsSrtFilesRecursive(subdirPath)) {
          const course = buildCourse(subdirPath);
          if (course) {
            courses.push(course);
          }
        }
      }
    }
  }
  return courses;
}
function extractCourseName(coursePath) {
  return coursePath.split(/[\\/]/).pop() || coursePath;
}
function buildCourse(coursePath) {
  const state = detectCourseState(coursePath);
  const name = extractCourseName(coursePath);
  if (state === "skipped") {
    return {
      path: coursePath,
      name,
      srtFiles: [],
      state: "skipped",
      hasSubfolders: false
    };
  }
  const srtFiles = scanCourseSrts(coursePath);
  if (srtFiles.length === 0) {
    return null;
  }
  const hasSubfolders = checkForModuleSubfolders(coursePath);
  return {
    path: coursePath,
    name,
    srtFiles,
    state,
    hasSubfolders
  };
}
function checkForModuleSubfolders(coursePath) {
  const entries = readdirSync3(coursePath);
  for (const entry of entries) {
    if (entry === "CODE" || entry.startsWith(".")) {
      continue;
    }
    const entryPath = join4(coursePath, entry);
    const stat = statSync3(entryPath);
    if (stat.isDirectory() && containsSrtFilesRecursive(entryPath)) {
      return true;
    }
  }
  return false;
}
async function scanForCoursesParallel(inputDir, recursive, _scanWorkers) {
  return scanForCourses(inputDir, recursive);
}
// src/agent/client.ts
import { query } from "@anthropic-ai/claude-agent-sdk";
import { existsSync as existsSync6 } from "fs";
import { join as join7 } from "path";

// src/agent/prompts.ts
function buildDiscoveryPrompt(course, srtFilePaths) {
  const filesByFolder = new Map;
  for (const filepath of srtFilePaths) {
    const parts = filepath.split(/[/\\]/);
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    if (!filesByFolder.has(folder)) {
      filesByFolder.set(folder, []);
    }
    filesByFolder.get(folder).push(parts[parts.length - 1]);
  }
  const folderOverview = Array.from(filesByFolder.entries()).map(([folder, files]) => `  - ${folder}/ (${files.length} files)`).join(`
`);
  return `Use the project-discovery skill to discover projects in this course.

## Course Information
- **Course Path**: ${course.path}
- **Course Name**: ${course.name}
- **Total SRT Files**: ${srtFilePaths.length}
- **Has Subfolders**: ${course.hasSubfolders}

## SRT File Structure
${folderOverview}

Follow the project-discovery skill workflow to analyze transcripts and create progress.json and project-findings.json files.`;
}
function buildGeneratorPrompt(course, project, relevantSrts) {
  const srtSection = relevantSrts.map((srt) => `=== ${srt.filename} ===
${srt.content}`).join(`

`);
  const outputPath = `${course.path}/CODE/__CC_Projects/${project.synthesized_name}`;
  return `Use the project-generator skill to generate project "${project.synthesized_name}" from the following transcripts.

## Project Specification
- **Name**: ${project.synthesized_name}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech_stack.join(", ")}
- **Complexity**: ${project.complexity}
- **Output Path**: ${outputPath}

## Source Transcripts

${srtSection}

Generate this project following the project-generator skill workflow. Ensure all required documentation files (CLAUDE.md, README.md, USAGE.md, CHANGELOG.md) are created.`;
}
function getDiscoverySystemPrompt() {
  return `You have access to the project-discovery skill which knows how to analyze course transcripts and create project manifests. Use it when asked to discover or analyze projects.`;
}
function getGeneratorSystemPrompt() {
  return `You have access to the project-generator skill which knows how to create complete working projects from transcripts. Use it when asked to generate or build projects.`;
}
var LARGE_PROJECT_THRESHOLD = 15;
var CHUNK_SIZE = 10;
var CHUNK_OVERLAP = 2;
function buildArchitectPrompt(course, project, srtFilePaths) {
  return `Extract the architecture specification for project "${project.synthesized_name}" by analyzing the source transcripts.

## Project Information
- **Project Name**: ${project.name}
- **Synthesized Name**: ${project.synthesized_name}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech_stack.join(", ")}
- **Complexity**: ${project.complexity}
- **Course Path**: ${course.path}

## Source Transcripts (${srtFilePaths.length} files)
${srtFilePaths.map((f) => `- ${f}`).join(`
`)}

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
function buildChunkedGeneratorPrompt(course, project, architectureSpec, chunkSrts, chunkIndex, totalChunks, previouslyGeneratedFiles) {
  const srtSection = chunkSrts.map((srt) => `=== ${srt.filename} ===
${srt.content}`).join(`

`);
  const outputPath = `${course.path}/CODE/__CC_Projects/${project.synthesized_name}`;
  const specSummary = `
## Architecture Spec (Reference)
- **Files to create**: ${architectureSpec.file_structure.length} total
- **Data models**: ${architectureSpec.data_models.map((m) => m.name).join(", ") || "None"}
- **API routes**: ${architectureSpec.api_routes.length} endpoints
- **Components**: ${architectureSpec.components.map((c) => c.name).join(", ") || "None"}
- **Key patterns**: ${architectureSpec.key_patterns.slice(0, 3).join(", ")}
- **Build order**: ${architectureSpec.build_order.slice(0, 5).join(" \u2192 ")}...

### Files Already Generated (${previouslyGeneratedFiles.length})
${previouslyGeneratedFiles.length > 0 ? previouslyGeneratedFiles.map((f) => `- ${f}`).join(`
`) : "None yet - this is the first chunk"}

### Remaining Files to Generate
${architectureSpec.file_structure.filter((f) => !previouslyGeneratedFiles.includes(f.path)).slice(0, 20).map((f) => `- ${f.path}: ${f.purpose}`).join(`
`)}
${architectureSpec.file_structure.length - previouslyGeneratedFiles.length > 20 ? `
... and ${architectureSpec.file_structure.length - previouslyGeneratedFiles.length - 20} more` : ""}
`;
  return `Generate code for project "${project.synthesized_name}" - Chunk ${chunkIndex + 1} of ${totalChunks}.

## Project Information
- **Name**: ${project.synthesized_name}
- **Output Path**: ${outputPath}
- **Tech Stack**: ${project.tech_stack.join(", ")}

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
- Mark any TODOs for details that will come in later chunks
${chunkIndex === totalChunks - 1 ? `
### Final Chunk - Complete Documentation
Since this is the LAST chunk, also create all documentation files per the project-generator skill (CLAUDE.md, README.md, USAGE.md, CHANGELOG.md).
` : ""}`;
}
function getArchitectSystemPrompt() {
  return `You are an expert software architect. Your task is to analyze course transcripts and extract a complete, detailed architecture specification.

Focus on:
- Identifying ALL files that need to be created
- Understanding data models and their relationships
- Mapping out API endpoints and their contracts
- Identifying reusable components
- Noting implementation patterns and best practices taught

The architecture spec you produce will guide code generation in chunks, so it must be comprehensive enough that each chunk can be generated independently while maintaining consistency.`;
}
function getChunkedGeneratorSystemPrompt() {
  return `You are implementing a project based on an architecture specification and transcript chunks.

Key rules:
- Follow the architecture spec for file structure and naming
- Only implement code that has details in the current chunk
- Create proper imports even for files not yet generated
- Maintain consistency with the established patterns
- Add TODO comments for parts that will be completed in later chunks`;
}

// src/agent/result-parser.ts
import { existsSync as existsSync5 } from "fs";
import { join as join6 } from "path";

// src/utils/logger.ts
import { appendFileSync } from "fs";
import { join as join5 } from "path";
var colors = {
  reset: "\x1B[0m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  gray: "\x1B[90m"
};
function timestamp() {
  return new Date().toISOString();
}
var logger = {
  info: (msg) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} [INFO] ${msg}`);
  },
  success: (msg) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.green}[SUCCESS]${colors.reset} ${msg}`);
  },
  warn: (msg) => {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${msg}`);
  },
  error: (msg) => {
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${msg}`);
  },
  debug: (msg) => {
    if (process.env.DEBUG) {
      console.log(`${colors.gray}[${timestamp()}] [DEBUG] ${msg}${colors.reset}`);
    }
  },
  courseError: (coursePath, error, inputDir) => {
    const msg = `The course located at "${coursePath}" has failed: ${error}`;
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERROR] ${msg}${colors.reset}`);
    console.error(`${colors.red}Moving on to the next course.${colors.reset}`);
    try {
      const logEntry = `[${timestamp()}] FAILED: ${coursePath}
  Reason: ${error}

`;
      appendFileSync(join5(inputDir, "error.log"), logEntry);
    } catch (e) {
      console.error(`${colors.red}Failed to write to error.log: ${e}${colors.reset}`);
    }
  },
  progress: (completed, total, skipped = 0) => {
    const remaining = total - completed - skipped;
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ` + `${colors.cyan}[PROGRESS]${colors.reset} ` + `${colors.green}${completed} completed${colors.reset}, ` + `${colors.yellow}${skipped} skipped${colors.reset}, ` + `${colors.blue}${remaining} remaining${colors.reset} ` + `(${total} total)`);
  },
  worker: (workerId, action, detail) => {
    const detailStr = detail ? `: ${detail}` : "";
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ` + `${colors.magenta}[Worker ${workerId}]${colors.reset} ${action}${detailStr}`);
  },
  banner: (text) => {
    const line = "=".repeat(60);
    console.log(`
${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.cyan}  ${text}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}
`);
  },
  summary: (stats) => {
    const durationSec = (stats.durationMs / 1000).toFixed(1);
    console.log(`
${colors.cyan}${"=".repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}`);
    console.log(`  Total courses:     ${stats.total}`);
    console.log(`  ${colors.green}Completed:         ${stats.completed}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped:           ${stats.skipped}${colors.reset}`);
    console.log(`  ${colors.red}Failed:            ${stats.failed}${colors.reset}`);
    console.log(`  Duration:          ${durationSec}s`);
    console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}
`);
  }
};

// src/agent/result-parser.ts
function parseDiscoveryResult(resultText, coursePath) {
  try {
    const findingsPath = join6(coursePath, "project-findings.json");
    let manifest = null;
    if (existsSync5(findingsPath)) {
      manifest = readJsonFile(findingsPath);
      if (process.env.DEBUG) {
        logger.info(`Read manifest from file: ${findingsPath}`);
      }
    }
    if (!manifest) {
      manifest = extractManifestJson(resultText);
    }
    if (!manifest) {
      return {
        has_projects: false,
        project_count: 0,
        skipped_srts: [],
        no_project_reason: "Could not parse discovery result",
        manifest: null
      };
    }
    const normalizedManifest = normalizeManifest(manifest, coursePath);
    return {
      has_projects: normalizedManifest.has_projects,
      project_count: normalizedManifest.projects.length,
      skipped_srts: normalizedManifest.skipped_srts,
      no_project_reason: normalizedManifest.no_project_reason,
      manifest: normalizedManifest
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse discovery result: ${errorMsg}`);
    return {
      has_projects: false,
      project_count: 0,
      skipped_srts: [],
      no_project_reason: `Parse error: ${errorMsg}`,
      manifest: null
    };
  }
}
function parseGeneratorResult(resultText, projectName, coursePath) {
  try {
    if (coursePath) {
      const projectPath = join6(coursePath, "CODE", "__CC_Projects", projectName);
      if (existsSync5(projectPath)) {
        const filesCreated = scanProjectFiles(projectPath);
        if (process.env.DEBUG) {
          logger.info(`Found project on disk: ${projectPath} with ${filesCreated.length} files`);
        }
        return {
          project_name: projectName,
          output_path: projectPath,
          files_created: filesCreated,
          status: filesCreated.length > 0 ? "success" : "partial",
          errors: []
        };
      }
    }
    const json = extractJson(resultText);
    if (!json) {
      return {
        project_name: projectName,
        output_path: "",
        files_created: [],
        status: "failed",
        errors: ["Project folder not found and could not parse generator result"]
      };
    }
    return {
      project_name: json.project_name || projectName,
      output_path: json.output_path || "",
      files_created: Array.isArray(json.files_created) ? json.files_created : [],
      status: validateStatus(json.status),
      errors: Array.isArray(json.errors) ? json.errors : []
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse generator result: ${errorMsg}`);
    return {
      project_name: projectName,
      output_path: "",
      files_created: [],
      status: "failed",
      errors: [`Parse error: ${errorMsg}`]
    };
  }
}
function scanProjectFiles(projectPath) {
  const files = [];
  function scan(dir, prefix = "") {
    try {
      const { readdirSync: readdirSync4, statSync: statSync4 } = __require("fs");
      const entries = readdirSync4(dir);
      for (const entry of entries) {
        const fullPath = join6(dir, entry);
        const relativePath = prefix ? `${prefix}/${entry}` : entry;
        const stat = statSync4(fullPath);
        if (stat.isFile()) {
          files.push(relativePath);
        } else if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
          scan(fullPath, relativePath);
        }
      }
    } catch {}
  }
  scan(projectPath);
  return files;
}
function extractManifestJson(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    } catch {}
  }
  return null;
}
function normalizeManifest(parsed, coursePath) {
  const rawProjects = parsed.projects || parsed.projects_found || parsed.projects_identified || [];
  const projects = Array.isArray(rawProjects) ? rawProjects.map((p, index) => {
    const rawSources = p.source_srts || p.source_lectures || [];
    let sourceSrts = [];
    if (Array.isArray(rawSources)) {
      sourceSrts = rawSources.map((s) => {
        if (typeof s === "string")
          return s;
        if (s && typeof s === "object" && s.file)
          return s.file;
        return String(s);
      });
    }
    const projectName = p.project_name || p.name || "Unknown";
    const synthesizedName = p.synthesized_name || p.project_id || `Project_${projectName.replace(/[^a-zA-Z0-9]/g, "")}`;
    const techStack = p.tech_stack || p.technologies || [];
    return {
      id: p.id || p.project_id || `proj_${String(index + 1).padStart(3, "0")}`,
      name: String(projectName),
      synthesized_name: String(synthesizedName),
      description: String(p.description || ""),
      source_srts: sourceSrts,
      tech_stack: Array.isArray(techStack) ? techStack : [],
      complexity: validateComplexity(p.complexity),
      generation_status: "not_started",
      generated_at: null,
      output_path: null
    };
  }) : [];
  let skippedSrts = [];
  if (Array.isArray(parsed.skipped_srts)) {
    skippedSrts = parsed.skipped_srts.map((s) => {
      if (typeof s === "string")
        return s;
      if (s && typeof s === "object" && s.file)
        return s.file;
      return String(s);
    });
  }
  return {
    course_path: parsed.course_path || coursePath,
    discovered_at: parsed.discovered_at || parsed.analysis_date || new Date().toISOString(),
    discovery_version: parsed.discovery_version || "1.0",
    has_projects: projects.length > 0,
    projects,
    skipped_srts: skippedSrts,
    no_project_reason: projects.length === 0 ? parsed.no_project_reason || "No projects identified" : null
  };
}
function validateComplexity(value) {
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "beginner";
}
function validateStatus(value) {
  if (value === "success" || value === "partial" || value === "failed") {
    return value;
  }
  return "failed";
}
function parseArchitectResult(resultText, projectName, coursePath) {
  try {
    const specPath = join6(coursePath, `architecture-${projectName}.json`);
    let spec = null;
    if (existsSync5(specPath)) {
      const rawSpec = readJsonFile(specPath);
      spec = normalizeArchitectureSpec(rawSpec, projectName);
      if (process.env.DEBUG) {
        logger.info(`Read architecture spec from file: ${specPath}`);
      }
    }
    if (!spec) {
      const json = extractJson(resultText);
      if (json) {
        spec = normalizeArchitectureSpec(json, projectName);
      }
    }
    if (!spec) {
      return {
        success: false,
        spec: null,
        error: "Could not parse architecture spec",
        spec_path: null
      };
    }
    return {
      success: true,
      spec,
      error: null,
      spec_path: existsSync5(specPath) ? specPath : null
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse architecture result: ${errorMsg}`);
    return {
      success: false,
      spec: null,
      error: `Parse error: ${errorMsg}`,
      spec_path: null
    };
  }
}
function normalizeArchitectureSpec(parsed, projectName) {
  return {
    project_name: parsed.project_name || projectName,
    synthesized_name: parsed.synthesized_name || projectName,
    description: parsed.description || "",
    tech_stack: Array.isArray(parsed.tech_stack) ? parsed.tech_stack : [],
    dependencies: parsed.dependencies || {},
    dev_dependencies: parsed.dev_dependencies || {},
    file_structure: Array.isArray(parsed.file_structure) ? parsed.file_structure.map((f) => ({
      path: f.path || "",
      purpose: f.purpose || "",
      exports: Array.isArray(f.exports) ? f.exports : []
    })) : [],
    data_models: Array.isArray(parsed.data_models) ? parsed.data_models.map((m) => ({
      name: m.name || "",
      orm_type: m.orm_type || "plain",
      fields: Array.isArray(m.fields) ? m.fields.map((f) => ({
        name: f.name || "",
        type: f.type || "string",
        required: f.required !== false,
        default: f.default
      })) : [],
      relations: Array.isArray(m.relations) ? m.relations : []
    })) : [],
    api_routes: Array.isArray(parsed.api_routes) ? parsed.api_routes.map((r) => ({
      method: validateHttpMethod(r.method),
      path: r.path || "",
      description: r.description || "",
      request_body: r.request_body,
      response: r.response
    })) : [],
    components: Array.isArray(parsed.components) ? parsed.components.map((c) => ({
      name: c.name || "",
      type: validateComponentType(c.type),
      props: Array.isArray(c.props) ? c.props : [],
      dependencies: Array.isArray(c.dependencies) ? c.dependencies : []
    })) : [],
    key_patterns: Array.isArray(parsed.key_patterns) ? parsed.key_patterns : [],
    build_order: Array.isArray(parsed.build_order) ? parsed.build_order : [],
    env_vars: Array.isArray(parsed.env_vars) ? parsed.env_vars : [],
    implementation_notes: Array.isArray(parsed.implementation_notes) ? parsed.implementation_notes : []
  };
}
function validateHttpMethod(method) {
  const upper = String(method).toUpperCase();
  if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
    return upper;
  }
  return "GET";
}
function validateComponentType(type) {
  if (["page", "layout", "component", "hook", "context", "util"].includes(type)) {
    return type;
  }
  return "component";
}
function extractJson(text) {
  return extractManifestJson(text);
}

// src/agent/client.ts
async function runCourseAgent(course, srtContents, workerId, eventEmitter) {
  const errors = [];
  let discoveryResult;
  const existingManifestPath = join7(course.path, "project-findings.json");
  if (existsSync6(existingManifestPath)) {
    if (process.env.DEBUG) {
      console.log(`[Discovery] Using existing manifest: ${existingManifestPath}`);
    }
    discoveryResult = parseDiscoveryResult("", course.path);
  } else {
    const srtFilePaths = srtContents.map((srt) => srt.filename);
    discoveryResult = await runDiscoveryAgent(course, srtFilePaths);
  }
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: "worker:discovery:complete",
      workerId,
      projectCount: discoveryResult.project_count
    });
  }
  if (!discoveryResult.has_projects || !discoveryResult.manifest) {
    return {
      status: "no_projects",
      discovery: discoveryResult,
      projectsGenerated: [],
      errors: discoveryResult.manifest ? [] : ["Discovery failed to produce manifest"]
    };
  }
  const projectsToGenerate = discoveryResult.manifest.projects.filter((p) => p.generation_status === "not_started");
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: "worker:generation:start",
      workerId,
      total: projectsToGenerate.length
    });
  }
  const projectsGenerated = [];
  let completedCount = 0;
  for (const project of projectsToGenerate) {
    try {
      const isLargeProject = project.source_srts.length > LARGE_PROJECT_THRESHOLD;
      let result;
      if (isLargeProject) {
        if (process.env.DEBUG) {
          console.log(`[Generator] Large project detected: ${project.synthesized_name} (${project.source_srts.length} SRTs)`);
        }
        result = await runLargeProjectGeneration(course, project, srtContents);
      } else {
        result = await runGeneratorAgent(course, project, srtContents);
      }
      await runGitHubIntegration(result, workerId, eventEmitter);
      projectsGenerated.push(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to generate ${project.synthesized_name}: ${errorMsg}`);
      projectsGenerated.push({
        project_name: project.synthesized_name,
        output_path: "",
        files_created: [],
        status: "failed",
        errors: [errorMsg]
      });
    }
    completedCount++;
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: "worker:generation:progress",
        workerId,
        current: completedCount,
        total: projectsToGenerate.length,
        projectName: project.synthesized_name
      });
    }
  }
  const allFailed = projectsGenerated.every((p) => p.status === "failed");
  return {
    status: allFailed ? "failed" : "complete",
    discovery: discoveryResult,
    projectsGenerated,
    errors
  };
}
async function runDiscoveryAgent(course, srtFilePaths) {
  const prompt = buildDiscoveryPrompt(course, srtFilePaths);
  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: "acceptEdits",
        settingSources: ["user"],
        allowedTools: ["Skill", "Read", "Write", "Glob", "Grep", "Edit", "Bash"],
        systemPrompt: getDiscoverySystemPrompt()
      }
    });
    let finalResultText = null;
    let lastError = null;
    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log("[Discovery] Message:", JSON.stringify(message, null, 2).slice(0, 500));
      }
      if (message.type === "result") {
        if (message.subtype === "success") {
          finalResultText = message.result;
          if (process.env.DEBUG) {
            console.log("[Discovery] Final result:", finalResultText?.slice(0, 1000));
          }
        } else {
          lastError = message.errors?.join(", ") || "Unknown error";
          if (process.env.DEBUG) {
            console.log("[Discovery] Error:", lastError);
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
      no_project_reason: lastError || "Discovery returned no result",
      manifest: null
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      has_projects: false,
      project_count: 0,
      skipped_srts: [],
      no_project_reason: `Discovery error: ${errorMsg}`,
      manifest: null
    };
  }
}
async function runGeneratorAgent(course, project, allSrtContents) {
  const relevantSrts = allSrtContents.filter((srt) => project.source_srts.includes(srt.filename));
  if (process.env.DEBUG) {
    console.log(`[Generator] Project: ${project.synthesized_name}`);
    console.log(`[Generator] Project source_srts (${project.source_srts.length}):`, project.source_srts.slice(0, 5));
    console.log(`[Generator] All SRT filenames (${allSrtContents.length}):`, allSrtContents.map((s) => s.filename).slice(0, 5));
    console.log(`[Generator] Matched SRTs: ${relevantSrts.length}`);
  }
  const prompt = buildGeneratorPrompt(course, project, relevantSrts);
  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: "acceptEdits",
        settingSources: ["user"],
        allowedTools: ["Skill", "Read", "Write", "Glob", "Grep", "Edit", "Bash"],
        systemPrompt: getGeneratorSystemPrompt()
      }
    });
    let finalResultText = null;
    let lastError = null;
    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log("[Generator] Message:", JSON.stringify(message, null, 2).slice(0, 500));
      }
      if (message.type === "result") {
        if (message.subtype === "success") {
          finalResultText = message.result;
          if (process.env.DEBUG) {
            console.log("[Generator] Final result:", finalResultText?.slice(0, 1000));
          }
        } else {
          lastError = message.errors?.join(", ") || "Unknown error";
          if (process.env.DEBUG) {
            console.log("[Generator] Error:", lastError);
          }
        }
      }
    }
    return parseGeneratorResult(finalResultText || "", project.synthesized_name, course.path);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return parseGeneratorResult("", project.synthesized_name, course.path);
  }
}
async function runLargeProjectGeneration(course, project, allSrtContents) {
  const projectName = project.synthesized_name;
  const relevantSrts = allSrtContents.filter((srt) => project.source_srts.includes(srt.filename));
  if (process.env.DEBUG) {
    console.log(`[LargeProject] Starting: ${projectName}`);
    console.log(`[LargeProject] Relevant SRTs: ${relevantSrts.length}`);
  }
  let architectureSpec;
  const existingSpecPath = join7(course.path, `architecture-${projectName}.json`);
  if (existsSync6(existingSpecPath)) {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Using existing spec: ${existingSpecPath}`);
    }
    const specResult = parseArchitectResult("", projectName, course.path);
    if (!specResult.success || !specResult.spec) {
      return {
        project_name: projectName,
        output_path: "",
        files_created: [],
        status: "failed",
        errors: ["Failed to load existing architecture spec"]
      };
    }
    architectureSpec = specResult.spec;
  } else {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Running architect phase`);
    }
    const architectResult = await runArchitectAgent(course, project, project.source_srts);
    if (!architectResult.success || !architectResult.spec) {
      return {
        project_name: projectName,
        output_path: "",
        files_created: [],
        status: "failed",
        errors: [architectResult.error || "Architect phase failed"]
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
  const chunks = createSrtChunks(relevantSrts);
  if (process.env.DEBUG) {
    console.log(`[LargeProject] Created ${chunks.length} chunks`);
  }
  const allFilesCreated = [];
  const allErrors = [];
  for (const chunk of chunks) {
    if (process.env.DEBUG) {
      console.log(`[LargeProject] Processing chunk ${chunk.index + 1}/${chunk.total}`);
    }
    try {
      const chunkResult = await runChunkedGenerator(course, project, architectureSpec, chunk, allFilesCreated);
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
  const projectPath = join7(course.path, "CODE", "__CC_Projects", projectName);
  const projectExists = existsSync6(projectPath);
  return {
    project_name: projectName,
    output_path: projectExists ? projectPath : "",
    files_created: allFilesCreated,
    status: allFilesCreated.length > 0 ? allErrors.length > 0 ? "partial" : "success" : "failed",
    errors: allErrors
  };
}
async function runArchitectAgent(course, project, srtFilePaths) {
  const prompt = buildArchitectPrompt(course, project, srtFilePaths);
  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: "acceptEdits",
        settingSources: ["user"],
        allowedTools: ["Skill", "Read", "Write", "Glob", "Grep"],
        systemPrompt: getArchitectSystemPrompt()
      }
    });
    let finalResultText = null;
    let lastError = null;
    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log("[Architect] Message:", JSON.stringify(message, null, 2).slice(0, 500));
      }
      if (message.type === "result") {
        if (message.subtype === "success") {
          finalResultText = message.result;
        } else {
          lastError = message.errors?.join(", ") || "Unknown error";
        }
      }
    }
    return parseArchitectResult(finalResultText || "", project.synthesized_name, course.path);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      spec: null,
      error: `Architect error: ${errorMsg}`,
      spec_path: null
    };
  }
}
async function runChunkedGenerator(course, project, architectureSpec, chunk, previouslyGeneratedFiles) {
  const prompt = buildChunkedGeneratorPrompt(course, project, architectureSpec, chunk.srts, chunk.index, chunk.total, previouslyGeneratedFiles);
  try {
    const result = query({
      prompt,
      options: {
        cwd: course.path,
        permissionMode: "acceptEdits",
        settingSources: ["user"],
        allowedTools: ["Skill", "Read", "Write", "Glob", "Grep", "Edit", "Bash"],
        systemPrompt: getChunkedGeneratorSystemPrompt()
      }
    });
    let finalResultText = null;
    for await (const message of result) {
      if (process.env.DEBUG) {
        console.log(`[ChunkedGen ${chunk.index + 1}] Message:`, JSON.stringify(message, null, 2).slice(0, 500));
      }
      if (message.type === "result" && message.subtype === "success") {
        finalResultText = message.result;
      }
    }
    return parseGeneratorResult(finalResultText || "", project.synthesized_name, course.path);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      project_name: project.synthesized_name,
      output_path: "",
      files_created: [],
      status: "failed",
      errors: [`Chunk ${chunk.index + 1} error: ${errorMsg}`]
    };
  }
}
function convertToRepoName(projectName) {
  const stripped = projectName.replace(/^Project_/, "");
  return `ccg_${stripped}`;
}
async function execCommand(command, cwd) {
  try {
    const proc = Bun.spawn(["sh", "-c", command], {
      cwd,
      stdout: "pipe",
      stderr: "pipe"
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    return { success: exitCode === 0, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
}
async function runGitHubIntegration(generatedProject, workerId, eventEmitter) {
  if (generatedProject.status === "failed" || !generatedProject.output_path) {
    return;
  }
  const projectPath = generatedProject.output_path;
  const repoName = convertToRepoName(generatedProject.project_name);
  if (workerId !== undefined && eventEmitter) {
    eventEmitter.emit({
      type: "worker:github:start",
      workerId,
      projectName: generatedProject.project_name
    });
  }
  const ghVersionResult = await execCommand("gh --version");
  if (!ghVersionResult.success) {
    const reason = "GitHub CLI (gh) not installed";
    console.log("\x1B[33m[GitHub] " + reason + " - skipping repo creation.\x1B[0m");
    generatedProject.github = { status: "skipped", error: reason };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({ type: "worker:github:skipped", workerId, reason });
    }
    return;
  }
  const authResult = await execCommand("gh auth status");
  if (!authResult.success) {
    const reason = "Not logged in to GitHub CLI";
    console.log("\x1B[33m[GitHub] " + reason + " - skipping repo creation. Run 'gh auth login' to enable.\x1B[0m");
    generatedProject.github = { status: "skipped", error: reason };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({ type: "worker:github:skipped", workerId, reason });
    }
    return;
  }
  try {
    await execCommand("git init", projectPath);
    await execCommand("git add .", projectPath);
    await execCommand('git commit -m "Init commit"', projectPath);
    const createResult = await execCommand(`gh repo create "${repoName}" --public --source . --push --description "Auto-generated from course transcripts by CCProjectSynth"`, projectPath);
    if (!createResult.success) {
      const error = createResult.stderr || "Failed to create GitHub repo";
      generatedProject.github = { status: "failed", error };
      if (workerId !== undefined && eventEmitter) {
        eventEmitter.emit({
          type: "worker:github:failed",
          workerId,
          projectName: generatedProject.project_name,
          error
        });
      }
      return;
    }
    const repoUrlMatch = createResult.stdout.match(/https:\/\/github\.com\/[^\s]+/);
    const repoUrl = repoUrlMatch ? repoUrlMatch[0] : `https://github.com/${repoName}`;
    generatedProject.github = { status: "pushed", repo_url: repoUrl };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: "worker:github:complete",
        workerId,
        projectName: generatedProject.project_name,
        repoUrl
      });
    }
    if (process.env.DEBUG) {
      console.log(`[GitHub] Successfully created repo: ${repoUrl}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    generatedProject.github = { status: "failed", error: errorMsg };
    if (workerId !== undefined && eventEmitter) {
      eventEmitter.emit({
        type: "worker:github:failed",
        workerId,
        projectName: generatedProject.project_name,
        error: errorMsg
      });
    }
  }
}
function createSrtChunks(srts) {
  const chunks = [];
  const totalChunks = Math.ceil(srts.length / CHUNK_SIZE);
  for (let i = 0;i < srts.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunkSrts = srts.slice(i, i + CHUNK_SIZE);
    if (chunkSrts.length < CHUNK_SIZE / 2 && chunks.length > 0) {
      chunks[chunks.length - 1].srts.push(...chunkSrts.filter((srt) => !chunks[chunks.length - 1].srts.includes(srt)));
      break;
    }
    const overlapFiles = i > 0 ? srts.slice(Math.max(0, i - CHUNK_OVERLAP), i).map((s) => s.filename) : [];
    chunks.push({
      index: chunks.length,
      total: totalChunks,
      srts: chunkSrts,
      overlap_from_previous: overlapFiles
    });
  }
  chunks.forEach((chunk) => {
    chunk.total = chunks.length;
  });
  return chunks;
}

// src/worker/worker.ts
async function processCourse(course, inputDir, workerId, eventEmitter) {
  const startTime = Date.now();
  try {
    const srtContents = loadAllSrtContents(course.path, course.srtFiles);
    const agentResult = await runCourseAgent(course, srtContents, workerId, eventEmitter);
    const durationMs = Date.now() - startTime;
    return {
      coursePath: course.path,
      status: agentResult.status,
      discovery: agentResult.discovery,
      projectsGenerated: agentResult.projectsGenerated,
      errors: agentResult.errors,
      durationMs
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      coursePath: course.path,
      status: "failed",
      discovery: {
        has_projects: false,
        project_count: 0,
        skipped_srts: [],
        no_project_reason: `Processing error: ${errorMessage}`,
        manifest: null
      },
      projectsGenerated: [],
      errors: [errorMessage],
      durationMs
    };
  }
}

// src/worker/shutdown.ts
function setupShutdownHandler() {
  let eventEmitter = null;
  const controller = {
    isShuttingDown: false,
    forceExit: false,
    setEventEmitter: (emitter) => {
      eventEmitter = emitter;
    }
  };
  let ctrlCCount = 0;
  const handleSignal = (_signal) => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      controller.isShuttingDown = true;
      eventEmitter?.emit({ type: "shutdown:signal", count: 1 });
    } else {
      controller.forceExit = true;
      eventEmitter?.emit({ type: "shutdown:signal", count: 2 });
      setTimeout(() => process.exit(1), 100);
    }
  };
  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  return controller;
}
function shouldContinueProcessing(controller) {
  return !controller.isShuttingDown;
}

// src/worker/pool.ts
async function runWorkerPool(courses, options) {
  const { concurrency, shutdownController, inputDir, eventEmitter } = options;
  const pendingCourses = courses.filter((c) => c.state === "pending");
  const skippedCount = courses.filter((c) => c.state === "skipped").length;
  if (pendingCourses.length === 0) {
    return [];
  }
  eventEmitter?.emit({ type: "pool:start", workerCount: concurrency });
  const queue = [...pendingCourses];
  const results = [];
  const activeWorkers = new Map;
  const stats = {
    total: pendingCourses.length + skippedCount,
    completed: 0,
    failed: 0,
    skipped: skippedCount,
    remaining: pendingCourses.length
  };
  eventEmitter?.emit({ type: "stats:update", stats: { ...stats } });
  const workers = [];
  for (let workerId = 0;workerId < concurrency; workerId++) {
    workers.push((async () => {
      while (true) {
        if (!shouldContinueProcessing(shutdownController)) {
          if (activeWorkers.has(workerId)) {} else {
            eventEmitter?.emit({ type: "worker:idle", workerId });
            break;
          }
        }
        const course = queue.shift();
        if (!course) {
          eventEmitter?.emit({ type: "worker:idle", workerId });
          break;
        }
        activeWorkers.set(workerId, course.path);
        eventEmitter?.emit({ type: "worker:start", workerId, course });
        eventEmitter?.emit({ type: "worker:discovery:start", workerId });
        try {
          const result = await processCourse(course, inputDir, workerId, eventEmitter);
          results.push(result);
          if (result.status === "complete" || result.status === "no_projects") {
            stats.completed++;
          } else {
            stats.failed++;
          }
          stats.remaining = queue.length;
          eventEmitter?.emit({ type: "worker:complete", workerId, result });
          eventEmitter?.emit({ type: "stats:update", stats: { ...stats } });
        } catch (error) {
          stats.failed++;
          stats.remaining = queue.length;
          const errorMsg = error instanceof Error ? error.message : String(error);
          eventEmitter?.emit({
            type: "worker:error",
            workerId,
            error: errorMsg,
            coursePath: course.path
          });
          eventEmitter?.emit({ type: "stats:update", stats: { ...stats } });
          results.push({
            coursePath: course.path,
            status: "failed",
            discovery: {
              has_projects: false,
              project_count: 0,
              skipped_srts: [],
              no_project_reason: null,
              manifest: null
            },
            projectsGenerated: [],
            errors: [errorMsg],
            durationMs: 0
          });
        }
        activeWorkers.delete(workerId);
        if (!shouldContinueProcessing(shutdownController)) {
          eventEmitter?.emit({ type: "worker:idle", workerId });
          break;
        }
      }
    })());
  }
  await Promise.all(workers);
  eventEmitter?.emit({ type: "pool:complete", stats: { ...stats } });
  return results;
}
// src/worker/events.ts
class SynthEventEmitter {
  listeners = new Set;
  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Event listener error:", err);
      }
    }
  }
  clear() {
    this.listeners.clear();
  }
}
function createEventEmitter() {
  return new SynthEventEmitter;
}
// src/cli/commands.ts
async function runSynthesizer(options) {
  const { inputDir, recursive, concurrency, scanWorkers, shutdownController } = options;
  const resolvedInput = resolve(inputDir);
  if (!existsSync7(resolvedInput)) {
    throw new Error(`Input directory does not exist: ${resolvedInput}`);
  }
  const eventEmitter = createEventEmitter();
  if ("setEventEmitter" in shutdownController) {
    shutdownController.setEventEmitter(eventEmitter);
  }
  setupConsoleLogging(eventEmitter);
  console.log(`
\uD83D\uDCC2 Scanning for courses...
`);
  eventEmitter.emit({ type: "scan:start" });
  const courses = await scanForCoursesParallel(resolvedInput, recursive, scanWorkers);
  const pendingCourses = courses.filter((c) => c.state === "pending");
  const skippedCourses = courses.filter((c) => c.state === "skipped");
  eventEmitter.emit({
    type: "scan:complete",
    total: courses.length,
    skipped: skippedCourses.length
  });
  console.log(`Found ${courses.length} course(s): ${pendingCourses.length} to process, ${skippedCourses.length} skipped
`);
  if (courses.length === 0 || pendingCourses.length === 0) {
    console.log("No courses to process.");
    eventEmitter.emit({
      type: "pool:complete",
      stats: {
        total: courses.length,
        completed: 0,
        failed: 0,
        skipped: skippedCourses.length,
        remaining: 0
      }
    });
    return;
  }
  console.log(`\uD83D\uDE80 Starting project synthesis...
`);
  await runWorkerPool(courses, {
    concurrency,
    shutdownController,
    inputDir: resolvedInput,
    eventEmitter
  });
  console.log(`
\u2705 All processing complete.`);
}
function setupConsoleLogging(eventEmitter) {
  eventEmitter.on((event) => {
    switch (event.type) {
      case "worker:start":
        console.log(`[W${event.workerId}] Starting: ${event.course.name}`);
        break;
      case "worker:discovery:complete":
        console.log(`[W${event.workerId}] Discovery complete: ${event.projectCount} project(s) found`);
        break;
      case "worker:generation:progress":
        console.log(`[W${event.workerId}] Generated: ${event.projectName} (${event.current}/${event.total})`);
        break;
      case "worker:github:complete":
        console.log(`[W${event.workerId}] Pushed to GitHub: ${event.repoUrl}`);
        break;
      case "worker:github:skipped":
        console.log(`\x1B[33m[GitHub] ${event.reason} - skipping repo creation.\x1B[0m`);
        break;
      case "worker:github:failed":
        console.log(`\x1B[31m[W${event.workerId}] GitHub push failed for ${event.projectName}: ${event.error}\x1B[0m`);
        break;
      case "worker:complete":
        const { result } = event;
        const status = result.status === "complete" ? "\u2713" : result.status === "failed" ? "\u2717" : "\u25CB";
        console.log(`[W${event.workerId}] ${status} Completed: ${result.projectsGenerated.length} project(s)`);
        break;
      case "worker:error":
        console.log(`\x1B[31m[W${event.workerId}] Error: ${event.error}\x1B[0m`);
        break;
      case "pool:complete":
        const { stats } = event;
        console.log(`
\uD83D\uDCCA Summary: ${stats.completed} completed, ${stats.failed} failed, ${stats.skipped} skipped`);
        break;
      case "shutdown:signal":
        if (event.count === 1) {
          console.log(`
\u23F3 Shutting down gracefully... (press Ctrl+C again to force)`);
        } else {
          console.log(`
\u26A0\uFE0F Force shutting down...`);
        }
        break;
    }
  });
}

// src/index.ts
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (args.version) {
    printVersion();
    process.exit(0);
  }
  if (!args.input) {
    console.error("Error: Input directory (-i) is required.");
    console.error("Use --help for usage information.");
    process.exit(1);
  }
  const shutdownController = setupShutdownHandler();
  try {
    await runSynthesizer({
      inputDir: args.input,
      recursive: args.recursive,
      concurrency: args.concurrency,
      scanWorkers: args.scanWorkers,
      shutdownController
    });
    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${errorMsg}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
