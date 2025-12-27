# CCProjectSynth Usage Guide

## Table of Contents

- [TUI Dashboard](#tui-dashboard)
- [Basic Usage](#basic-usage)
- [Processing Modes](#processing-modes)
- [Concurrency Configuration](#concurrency-configuration)
- [Understanding Output](#understanding-output)
- [Working with Manifests](#working-with-manifests)
- [Handling Interruptions](#handling-interruptions)
- [Troubleshooting](#troubleshooting)

## TUI Dashboard

When you run CCProjectSynth, a real-time terminal dashboard displays progress:

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

┌─ Recent Activity ───────────────────────────────────────────────┐
│ ✓ Vue_Composition_API    3 projects    2m 34s                   │
│ ✓ Django_REST_Framework  2 projects    3m 12s                   │
│ ✗ Broken_Course          Error: No SRT files found              │
└─────────────────────────────────────────────────────────────────┘

┌─ Metrics ───────────────────────────────────────────────────────┐
│ Avg: 2.8m/course   2.1 projects/course   Success: 94%   ETA: 8m │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Panels

| Panel | Description |
|-------|-------------|
| **Header** | App name, current phase (Scanning/Processing/Complete), elapsed time |
| **Progress** | Overall progress bar, percentage, and course statistics |
| **Workers** | Status of each concurrent worker with course name and duration |
| **Recent Activity** | Last 4 completed or failed courses with project counts |
| **Metrics** | Average time per course, success rate, and estimated time remaining |

### Status Icons

| Icon | Meaning |
|------|---------|
| ○ | Idle worker |
| ● | Active (Discovery or Generation phase) |
| ✓ | Completed successfully |
| ✗ | Failed |
| ⊘ | Skipped (already complete) |

### Phase Indicators

The header shows the current processing phase:

- **Scanning** - Searching for courses with SRT files
- **Processing** - Running discovery and generation on courses
- **Complete** - All courses processed
- **Shutdown** - Graceful shutdown in progress

## Basic Usage

### Single Course Processing

Process a single course folder containing SRT transcript files:

```bash
bun start -- -i "C:\Courses\ReactMasterclass"
```

The application will:
1. Scan for all `.srt` files in the directory (including subdirectories)
2. Run the discovery phase to identify projects
3. Generate each discovered project in parallel
4. Create output in `CODE/__CC_Projects/`

### Multiple Courses

Process all courses in a parent directory:

```bash
bun start -- -i "C:\AllCourses" -r
```

The `-r` flag enables recursive scanning, finding all directories that contain SRT files.

## Processing Modes

### Fresh Processing

When a course has no `progress.json` or `__CC_Projects` folder, it's processed from scratch:

```bash
bun start -- -i "/path/to/new-course"
```

### Resume After Interruption

If processing was interrupted (status: "started"), the application automatically:
1. Cleans up partial output
2. Restarts processing from the beginning

```bash
# Just run normally - resume is automatic
bun start -- -i "/path/to/interrupted-course"
```

### Skip Completed Courses

Courses with `status: "complete"` or existing `__CC_Projects` are automatically skipped:

```bash
# Re-running is safe - completed courses won't be reprocessed
bun start -- -i "/path/to/courses" -r
```

## Concurrency Configuration

### Worker Count

Control how many courses are processed simultaneously:

```bash
# Process 10 courses at once (default: 5)
bun start -- -i "/path/to/courses" -r -c 10
```

**Guidelines:**
- Each worker spawns Claude agents, which consume API resources
- Higher concurrency = faster overall processing but more resource usage
- Start with default (5) and adjust based on your system

### Scan Workers

Control parallel scanning when using recursive mode:

```bash
# Use 5 parallel scan workers (default: 3)
bun start -- -i "/path/to/courses" -r -s 5
```

Note: `-s` only has effect when combined with `-r`.

### Combined Example

```bash
# Recursive scan with 8 course workers and 4 scan workers
bun start -- -i "/path/to/courses" -r -c 8 -s 4
```

## Understanding Output

### Progress File

Each course gets a `progress.json` tracking its state:

```json
{
  "status": "complete",
  "started_at": "2025-01-15T10:00:00Z",
  "completed_at": "2025-01-15T10:15:00Z"
}
```

Status values:
- `started` - Processing in progress
- `complete` - Successfully finished

### Project Findings Manifest

The `project-findings.json` contains discovered projects:

```json
{
  "course_path": "/path/to/course",
  "discovered_at": "2025-01-15T10:30:00Z",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "Todo Application",
      "synthesized_name": "Project_ReactTodoWithLocalStorage",
      "source_srts": ["03_Building_Todo.srt", "04_Todo_Persistence.srt"],
      "tech_stack": ["React", "JavaScript", "LocalStorage"],
      "complexity": "intermediate",
      "generation_status": "completed"
    }
  ]
}
```

### Generated Project Structure

Each project in `CODE/__CC_Projects/` includes:

```
Project_ReactTodoWithLocalStorage/
├── CLAUDE.md       # Context for future Claude sessions
├── README.md       # Project overview and setup
├── USAGE.md        # Detailed usage instructions
├── CHANGELOG.md    # Version history
├── package.json    # Dependencies (if applicable)
├── tsconfig.json   # TypeScript config (if applicable)
└── src/
    ├── index.ts
    ├── components/
    └── ...
```

## Working with Manifests

### Review Before Generation

The two-phase approach lets you review discoveries before generation:

1. Run discovery only (interrupt after discovery phase)
2. Review `project-findings.json`
3. Modify if needed (remove unwanted projects, adjust names)
4. Re-run to generate

### Selective Regeneration

To regenerate a specific project:

1. Edit `project-findings.json`
2. Set the project's `generation_status` to `"not_started"`
3. Delete the project's folder from `__CC_Projects/`
4. Re-run the application

### No Projects Found

If no projects are discovered:
- A `log.txt` is created in `CODE/__CC_Projects/` explaining why
- Check if the course actually contains hands-on coding content
- Review SRT files for project-related discussions

## Handling Interruptions

### Graceful Shutdown

Press **Ctrl+C once** for graceful shutdown:

- The TUI header changes to show "Shutdown" phase
- Workers complete their current courses
- No new courses are started
- The application exits when all workers finish

```
┌─────────────────────────────────────────────────────────────────┐
│  CCProjectSynth                           Shutdown • 00:15:32   │
└─────────────────────────────────────────────────────────────────┘
```

### Force Exit

Press **Ctrl+C twice** for immediate exit:

- First Ctrl+C initiates graceful shutdown
- Second Ctrl+C forces immediate termination

**Warning:** Force exit may leave courses in incomplete state. They will be restarted on next run.

## Troubleshooting

### Debug Mode

Enable detailed logging:

```bash
DEBUG=1 bun start -- -i "/path/to/course"
```

### Error Log

Check `error.log` in the input directory for failed courses:

```
[2025-01-15T10:30:00Z] Course: /path/to/failed-course
Error: Discovery agent timeout after 300s
```

### Common Issues

**No SRT files found:**
```
Error: No SRT files found in /path/to/course
```
- Verify the directory contains `.srt` files
- Check file extensions (must be lowercase `.srt`)

**Skill not found:**
```
Error: Skill 'project-discovery' not found
```
- Install required skills to `~/.claude/skills/` or project `.claude/skills/`

**API rate limiting:**
```
Error: Rate limit exceeded
```
- Reduce concurrency with `-c` flag
- Wait and retry

**Incomplete generation:**
- Check project's `generation_status` in manifest
- Review `error.log` for specific failures
- Try regenerating the specific project

### Recovery Steps

1. **Check status:**
   ```bash
   cat "/path/to/course/progress.json"
   ```

2. **Force restart a course:**
   ```bash
   rm "/path/to/course/progress.json"
   rm -rf "/path/to/course/CODE/__CC_Projects"
   bun start -- -i "/path/to/course"
   ```

3. **Regenerate single project:**
   - Edit manifest: set `generation_status` to `"not_started"`
   - Delete project folder
   - Re-run application
