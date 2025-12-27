# CCProjectSynth

Synthesize working code projects from course transcript files (.srt) using Claude Code agents.

## Overview

CCProjectSynth scans course directories containing SRT transcript files, analyzes the content to discover teachable projects, and generates complete working implementations including documentation and source code.

## Features

- **Real-time TUI Dashboard**: Terminal interface showing worker status, progress, and metrics
- **Two-Phase Processing**: Discovery then generation using separate Claude Code skills
- **Persistent Manifest**: `project-findings.json` enables selective/deferred generation
- **Automatic Project Discovery**: Analyzes course transcripts to identify hands-on projects
- **Complete Code Generation**: Creates working implementations, not placeholders
- **Parallel Processing**: Process multiple courses and projects concurrently
- **Graceful Shutdown**: Ctrl+C completes current work before exiting
- **Resume Support**: Automatically skips already-completed courses

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Claude Code CLI installed and authenticated
- Required skills installed:
  - `project-discovery`
  - `project-generator`

## Installation

```bash
# Clone or download the project
cd CCProjectSynth

# Install dependencies
bun install
```

## Quick Start

```bash
# Process a single course folder
bun start -- -i "/path/to/course"

# Process all courses in a directory recursively
bun start -- -i "/path/to/courses" -r

# Process with custom concurrency
bun start -- -i "/path/to/courses" -r -c 10
```

## Command Line Options

| Flag | Description | Default |
|------|-------------|---------|
| `-i, --input <path>` | Input directory to scan (required) | - |
| `-r, --recursive` | Recursively scan for courses | false |
| `-c, --concurrency <n>` | Number of concurrent workers | 5 |
| `-s, --scan-workers <n>` | Number of scan workers (with -r) | 3 |
| `-h, --help` | Show help message | - |
| `-v, --version` | Show version | - |

## Architecture

CCProjectSynth uses a two-skill pipeline powered by the Claude Agent SDK:

```
┌─────────────────────────────────────────────────────────────┐
│                      Per Course Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐                                       │
│  │ project-discovery │ ← Reads SRTs, identifies projects    │
│  └────────┬─────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                       │
│  │ project-findings  │ ← Manifest file (persisted)          │
│  │     .json         │                                      │
│  └────────┬─────────┘                                       │
│           │                                                 │
│     ┌─────┴─────┐                                           │
│     ▼           ▼                                           │
│  ┌──────┐   ┌──────┐                                        │
│  │ gen  │   │ gen  │  ← Parallel generation per project     │
│  │ P1   │   │ P2   │                                        │
│  └──────┘   └──────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Skills

1. **project-discovery**: Analyzes all SRT files in a course, identifies hands-on coding projects, and outputs a `project-findings.json` manifest

2. **project-generator**: Takes a project specification from the manifest and generates a complete working implementation with documentation

## TUI Dashboard

The application displays a real-time terminal interface:

```
┌─────────────────────────────────────────────────────────────────┐
│  CCProjectSynth                          Processing • 00:13:45  │
└─────────────────────────────────────────────────────────────────┘

┌─ Progress ──────────────────────────────────────────────────────┐
│ │████████████████░░░░░░░░░░░░░░░░░░░░░░│  42%  (17/40)         │
│ ✓ 17 completed   ✗ 1 failed   ⊘ 3 skipped   ○ 19 remaining     │
└─────────────────────────────────────────────────────────────────┘

┌─ Workers ───────────────────────────────────────────────────────┐
│ W0  ● Discovery    Python_FastAPI_Course          00:01:23     │
│ W1  ● Generation   React_Hooks_Tutorial   [2/4]   00:02:45     │
│ W2  ● Generation   Node_Express_API       [1/2]   00:00:58     │
│ W3  ○ Idle                                                      │
│ W4  ○ Idle                                                      │
└─────────────────────────────────────────────────────────────────┘
```

The TUI shows:
- **Header**: Application name, phase status, and elapsed time
- **Progress**: Overall course completion with statistics
- **Workers**: Real-time status of each concurrent worker
- **Recent Activity**: Last completed/failed courses
- **Metrics**: Average time, success rate, and ETA

## Output Structure

For each processed course:

```
Course Folder/
├── progress.json              # Status tracking
├── project-findings.json      # Discovery manifest
├── *.srt                      # Original transcript files
└── CODE/
    └── __CC_Projects/
        ├── Project_ReactTodo/
        │   ├── CLAUDE.md      # Claude context for future sessions
        │   ├── README.md      # Project documentation
        │   ├── USAGE.md       # Usage guide
        │   ├── CHANGELOG.md   # Version history
        │   ├── package.json   # Dependencies
        │   └── src/           # Source code
        └── Project_AuthSystem/
            └── ...
```

## Manifest File

The discovery phase creates a `project-findings.json` manifest:

```json
{
  "course_path": "/path/to/course",
  "discovered_at": "2025-01-15T10:30:00Z",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "TodoApp",
      "synthesized_name": "Project_ReactTodoWithLocalStorage",
      "source_srts": ["03_Todo.srt", "04_Todo.srt"],
      "tech_stack": ["React", "JavaScript"],
      "generation_status": "not_started"
    }
  ]
}
```

## Course State Detection

The application determines course state as follows:

| State | Condition | Action |
|-------|-----------|--------|
| **Complete** | `progress.json` has `status: "complete"` OR `CODE/__CC_Projects/` exists | Skip |
| **Incomplete** | `progress.json` has `status: "started"` | Restart from scratch |
| **Pending** | No progress.json and no __CC_Projects | Process as new |

## Graceful Shutdown

- **Single Ctrl+C**: Stops accepting new courses, waits for current workers to finish
- **Double Ctrl+C**: Forces immediate exit (may leave courses incomplete)

## Error Handling

- Failed courses are logged to `error.log` in the input directory
- Workers continue processing remaining courses after failures
- Per-project errors are tracked in the manifest's `generation_status` field

## Development

```bash
# Type check
bun run typecheck

# Build for production
bun build

# Debug mode
DEBUG=1 bun start -- -i "/path/to/course"
```

## License

MIT
