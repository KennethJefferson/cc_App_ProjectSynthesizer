# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCProjectSynth synthesizes working code projects from course transcript files (.srt) using Claude Code agents. It scans course directories, analyzes transcripts to discover teachable projects, and generates complete working implementations.

## Commands

```bash
# Install dependencies
bun install

# Run the application
bun start -- -i "/path/to/course"           # Single course
bun start -- -i "/path/to/courses" -r       # Recursive scan
bun start -- -i "/path/to/courses" -r -c 10 # With 10 concurrent workers
bun start -- -i "/path/to/courses" -r -c 10 -s 5  # With custom scan workers

# Development
bun run typecheck   # Type check without emitting
bun build           # Build for production (outputs to dist/)

# Debug mode
DEBUG=1 bun start -- -i "/path/to/course"
```

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `-i, --input <path>` | required | Input directory |
| `-r, --recursive` | false | Scan recursively |
| `-c, --concurrency <n>` | 5 | Worker count |
| `-s, --scan-workers <n>` | 3 | Scan workers (requires -r) |
| `-h, --help` | - | Show help |
| `-v, --version` | - | Show version |

## Architecture

### Two-Skill Pipeline

The application uses two separate Claude Code skills per course:

1. **Discovery Phase** (`project-discovery` skill): Analyzes all SRT files, identifies hands-on projects, outputs `project-findings.json` manifest
2. **Generation Phase** (`project-generator` skill): Creates complete implementations from manifest entries, runs in parallel for multiple projects

```
Course → Discovery Agent → project-findings.json → Generator Agents (parallel) → Projects
```

### Core Components

- **`src/agent/client.ts`**: Two-skill pipeline orchestration using Claude Agent SDK
  - `runCourseAgent()` - Main orchestrator
  - `runDiscoveryAgent()` - Spawns discovery skill
  - `runGeneratorAgent()` - Spawns generator skill per project

- **`src/scanner/`**: Course and SRT file discovery with natural sort ordering

- **`src/worker/`**: Concurrent processing with graceful shutdown
  - `events.ts` - Event emitter for progress tracking and console output

- **`src/cli/commands.ts`**: CLI command handler with console-based progress logging

### SDK Usage Pattern

The application uses `@anthropic-ai/claude-agent-sdk` with this pattern:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt,
  options: {
    cwd: course.path,
    allowedTools: ['Read', 'Write', 'Glob', 'Grep'],  // or ['Read', 'Write', 'Edit', 'Bash', 'Glob'] for generator
    permissionMode: 'acceptEdits',
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: customSystemPrompt,
    },
  },
});

for await (const message of result) {
  if (message.type === 'result') {
    // Handle success/error
  }
}
```

### Key Types (`src/types/course.ts`)

```typescript
interface Course { path: string; name: string; srtFiles: string[]; }

interface ProjectFindingsManifest {
  course_path: string;
  discovered_at: string;
  has_projects: boolean;
  projects: ProjectEntry[];
}

interface ProjectEntry {
  id: string;
  name: string;
  synthesized_name: string;  // e.g., "Project_ReactTodoWithLocalStorage"
  source_srts: string[];
  tech_stack: string[];
  generation_status: 'not_started' | 'in_progress' | 'completed' | 'failed';
}
```

## Output Structure

```
Course Folder/
├── progress.json              # Status tracking
├── project-findings.json      # Discovery manifest
└── CODE/
    └── __CC_Projects/
        └── Project_Name/
            ├── CLAUDE.md, README.md, USAGE.md, CHANGELOG.md
            └── src/           # Source code
```

## Course State Detection

1. **Skipped**: `progress.json` with `status: "complete"` OR `CODE/__CC_Projects/` exists
2. **Pending (restart)**: `progress.json` with `status: "started"` → Cleans up and restarts
3. **Pending (fresh)**: No progress.json and no __CC_Projects

## Graceful Shutdown

The application uses a robust shutdown system ported from the ffmpeg-processor project:

### Signal Handling Architecture

1. **Emergency Handler** (`src/index.ts`): Registered at process startup BEFORE any other initialization
   - Catches SIGINT/SIGTERM immediately
   - Tracks Ctrl+C count for graceful vs force exit
   - Linked to shutdown controller via `linkShutdownController()`

2. **TUI Handler** (`src/cli/tui/app.tsx`): Global shutdown handler connected to app state
   - Updates UI to show shutdown status
   - Coordinates with worker pool to stop gracefully

3. **App State** (`src/cli/tui/context/app-state.tsx`): Tracks `ctrlCCount` and `isShuttingDown`
   - First Ctrl+C: Sets graceful shutdown mode
   - Second Ctrl+C: Triggers `process.exit(0)`

### User Behavior

- **Single Ctrl+C**: Shows "Shutdown requested..." message, stops accepting new courses, waits for current workers to finish
- **Double Ctrl+C**: Forces immediate exit with cursor/color cleanup

## Dependencies

- **Runtime**: Bun >= 1.0.0
- **SDK**: `@anthropic-ai/claude-agent-sdk` ^0.1.76
- **Skills Required**: `project-discovery` and `project-generator` installed
