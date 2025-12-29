---
name: project-discovery
description: Analyze course transcript files (.srt) to discover teachable projects. Use when you need to scan a course folder and identify what hands-on projects are taught, without generating any code. Outputs a manifest file that can be used later for selective project generation. Triggers on phrases like "discover projects", "analyze course", "find projects in transcripts", "what projects are in this course".
---

# Project Discovery Skill

Analyze course transcripts (.srt files) to discover and catalog projects taught in the course. Produces a manifest file (`project-findings.json`) that can be used for immediate or future project generation.

## Purpose

This skill scans course transcript files (.srt) and identifies hands-on coding projects that can be synthesized into working implementations.

## When to Use

- At the start of course processing
- Scanning a course to see what projects it contains
- Creating a catalog before deciding which projects to generate
- Preparing for batch processing of multiple courses
- When you need to identify what projects are taught in a course
- Before running project generation
- Any request to analyze or discover projects from transcripts

## Prerequisites

- Current working directory should be a course folder containing `.srt` files
- SRT files may be in the root or organized in module subfolders

## Capabilities

1. **Scan transcript files** - Find and read .srt files in course directories
2. **Identify projects** - Recognize hands-on coding projects vs theoretical content
3. **Map source files** - Track which transcripts belong to which project
4. **Classify complexity** - Beginner, intermediate, or advanced
5. **Detect tech stack** - Frameworks, languages, tools used

## Output

Creates two files in the course root:

### progress.json (ALWAYS created first)

This file is created **immediately** before any scanning begins. This ensures every touched course has a marker file, even if no projects are found.

```json
{
  "status": "started",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": null
}
```

After processing completes (regardless of whether projects were found):

```json
{
  "status": "complete",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:35:00Z"
}
```

### project-findings.json

Created after analysis. Contains discovered projects or records that none were found.

```json
{
  "course_path": "/path/to/course",
  "discovered_at": "2024-01-15T10:30:00Z",
  "discovery_version": "1.0",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "Job Portal Application",
      "synthesized_name": "Project_AdvancedJobPortal",
      "description": "Full-stack job portal with authentication...",
      "source_srts": ["01 - Introduction.srt", "02 - Setup.srt"],
      "tech_stack": ["Next.js", "TypeScript", "Prisma"],
      "complexity": "advanced",
      "generation_status": "not_started"
    }
  ],
  "skipped_srts": ["00 - Course Overview.srt"],
  "no_project_reason": null
}
```

## Workflow

### Step 1: Check/Create Progress Tracking (CRITICAL - DO THIS FIRST)

**This step must happen BEFORE any file scanning or analysis.**

Check for existing `progress.json` in the course root:

```javascript
// Check states:
// 1. progress.json exists with status="complete" → Course already processed
// 2. progress.json exists with status="started" → Incomplete, restart
// 3. No progress.json → Fresh course, proceed
```

**If status is "complete"**: Course already processed. Skip unless user explicitly requests re-run.

**If status is "started"**: Previous run was interrupted. Clean up any partial `CODE/__CC_Projects/` folder and restart.

**If no progress.json**: Create it **IMMEDIATELY** with status "started":

```json
{
  "status": "started",
  "started_at": "2025-01-15T10:30:00.000Z",
  "completed_at": null
}
```

**Why this matters**: Even if the course has zero projects, the `progress.json` file serves as a marker that this course has been scanned. Without it, future agents would repeatedly re-scan courses that contain no projects.

### Step 2: Locate SRT Files

Scan the course directory for all `.srt` files:

```bash
find . -name "*.srt" -type f | grep -v "CODE/" | sort
```

SRT files may be:
- Directly in course root: `./01_Intro.srt`, `./02_Basics.srt`
- In module subfolders: `./Module1/01_Setup.srt`, `./Module2/03_Functions.srt`

Collect all paths relative to course root.

### Step 3: Analyze Transcripts Sequentially

Read each SRT file **in sorted order** (order matters for tracking project continuity).

#### Handling Large Courses

For courses with 50+ SRT files:
1. Read first and last files of each section
2. Sample every 3rd-5th file in the middle
3. Focus on files with project-indicative names
4. Skip obvious theory files (intro, conclusion, quiz)

#### Project State Transitions

For each file, analyze content to determine project state:

**PROJECT STARTS when instructor:**
- Introduces hands-on coding exercise
- Uses phrases: "let's build", "we'll create", "start a new project"
- Begins explaining application architecture
- Runs project initialization commands (npm init, create-react-app, etc.)

**PROJECT CONTINUES when:**
- Same application is being extended
- References previously written code
- Adds features to existing project
- Uses phrases: "continuing our", "back to our", "let's add to"

**PROJECT ENDS when:**
- Instructor wraps up: "that completes", "we've finished"
- Completely different topic/project begins
- Section ends with summary

**SKIP (non-project content):**
- Course introductions/welcomes
- Pure theory without coding
- Tool installation guides (unless project-specific)
- Summaries/conclusions
- Quizzes/assessments

### Step 4: Build Project Manifest

For each discovered project, record:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g., `proj_001`) |
| `name` | Simple name from transcript (e.g., "TodoApp") |
| `synthesized_name` | Full name for folder (e.g., "Project_ReactTodoWithPersistence") |
| `description` | 1-2 sentence description |
| `source_srts` | Array of SRT files containing this project |
| `tech_stack` | Detected technologies |
| `complexity` | beginner / intermediate / advanced |
| `generation_status` | "not_started" (always for new discovery) |

### Step 5: Write Manifest File

Create `project-findings.json` in course root:

```json
{
  "course_path": "/absolute/path/to/course",
  "discovered_at": "2025-01-15T10:30:00.000Z",
  "discovery_version": "1.0",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "TodoApp",
      "synthesized_name": "Project_ReactTodoWithPersistence",
      "description": "A React todo application with local storage persistence",
      "source_srts": ["03_TodoApp_Part1.srt", "04_TodoApp_Part2.srt", "05_TodoApp_Part3.srt"],
      "tech_stack": ["React", "JavaScript", "CSS", "LocalStorage"],
      "complexity": "beginner",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    },
    {
      "id": "proj_002",
      "name": "AuthSystem",
      "synthesized_name": "Project_ReactAuthWithJWT",
      "description": "JWT-based authentication system with refresh tokens",
      "source_srts": ["07_AuthPart1.srt", "08_AuthPart2.srt"],
      "tech_stack": ["React", "Node.js", "Express", "JWT", "MongoDB"],
      "complexity": "intermediate",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    }
  ],
  "skipped_srts": [
    "01_Introduction.srt",
    "02_ReactBasics.srt",
    "06_StateTheory.srt",
    "09_Conclusion.srt"
  ],
  "no_project_reason": null
}
```

**If no projects found:**

```json
{
  "course_path": "/absolute/path/to/course",
  "discovered_at": "2025-01-15T10:30:00.000Z",
  "discovery_version": "1.0",
  "has_projects": false,
  "projects": [],
  "skipped_srts": ["all_files.srt"],
  "no_project_reason": "Course is purely conceptual with no hands-on coding projects"
}
```

### Step 6: Report Results

After writing the manifest, present findings to user:

```
## Discovery Complete

**Course**: /path/to/ReactMasterclass
**Projects Found**: 2

### Project 1: TodoApp
- **Generated Name**: Project_ReactTodoWithPersistence
- **Description**: A React todo application with local storage persistence
- **Source Files**: 03_TodoApp_Part1.srt, 04_TodoApp_Part2.srt, 05_TodoApp_Part3.srt
- **Tech Stack**: React, JavaScript, CSS, LocalStorage
- **Complexity**: Beginner

### Project 2: AuthSystem
- **Generated Name**: Project_ReactAuthWithJWT
- **Description**: JWT-based authentication system with refresh tokens
- **Source Files**: 07_AuthPart1.srt, 08_AuthPart2.srt
- **Tech Stack**: React, Node.js, Express, JWT, MongoDB
- **Complexity**: Intermediate

**Skipped Files**: 01_Introduction.srt, 02_ReactBasics.srt, 06_StateTheory.srt, 09_Conclusion.srt

---

Manifest saved to: project-findings.json

To generate all projects, use the project-generator skill.
To generate specific projects, specify by name or ID.
```

### Step 7: Update Progress to Complete

After writing `project-findings.json`, update `progress.json` to mark the course as complete:

```json
{
  "status": "complete",
  "started_at": "2025-01-15T10:30:00.000Z",
  "completed_at": "2025-01-15T10:35:00.000Z"
}
```

**This step happens regardless of whether projects were found.** A course with `has_projects: false` still gets marked complete so future agents know not to re-scan it.

## Project Identification Signals

**Positive signals** (indicates a project):
- "Let's build..."
- "Create a new project..."
- "npm create / npx create-..."
- File creation instructions
- Database setup
- API route implementation
- Component building

**Negative signals** (likely theoretical):
- "In this lecture we'll learn about..."
- Pure concept explanation
- No code shown
- Quiz or assessment
- Course recap

## Important Notes

### DO NOT in Discovery Phase
- Create any project folders
- Generate any source code
- Write any files except `progress.json` and `project-findings.json`
- Modify or delete SRT files

### Be Conservative
- Only mark as project if there's clear hands-on content
- Group correctly - One project may span multiple lectures
- Note gaps - Projects may have intermissions with unrelated content

### Synthesized Name Format

Pattern: `Project_[Framework][CoreFeature][Distinguisher]`

Examples:
- `Project_ReactTodoWithLocalStorage`
- `Project_NodeExpressRestAPI`
- `Project_PythonFlaskBlogAuth`
- `Project_VueEcommerceCart`
- "Job Portal" → `Project_JobPortal`
- "E-commerce Store with Stripe" → `Project_EcommerceStoreWithStripe`
- "React Native Weather App" → `Project_ReactNativeWeatherApp`

Rules:
- Always prefix with `Project_`
- PascalCase throughout
- Primary framework/language first
- Main feature next
- Optional distinguisher for clarity
- Maximum 50 characters

### Tech Stack Detection

Look for mentions of:

| Category | Examples |
|----------|----------|
| Languages | JavaScript, TypeScript, Python, Java, Go, Rust |
| Frontend | React, Vue, Angular, Svelte, Next.js |
| Backend | Express, Fastify, Django, Flask, FastAPI |
| Databases | PostgreSQL, MySQL, MongoDB, SQLite, Redis |
| Tools | Webpack, Vite, Docker, npm, yarn |

### Complexity Assessment

| Level | Indicators |
|-------|------------|
| **Beginner** | Single file or few files, basic CRUD, no auth, minimal dependencies |
| **Intermediate** | Multiple components, state management, basic auth, API integration |
| **Advanced** | Complex architecture, multiple services, OAuth/JWT, real-time features |

## Reference Files

See `references/` folder for:
- `discovery-patterns.md` - Detailed patterns for identifying projects
- `manifest-schema.md` - Complete JSON schema for project-findings.json
