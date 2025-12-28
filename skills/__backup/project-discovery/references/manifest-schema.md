# Manifest Schema Reference

Complete specification for `project-findings.json` file.

## Full Schema

```typescript
interface ProjectFindingsManifest {
  // Course identification
  course_path: string;           // Absolute path to course root
  discovered_at: string;         // ISO 8601 timestamp of discovery
  discovery_version: string;     // Schema version (currently "1.0")
  
  // Discovery results
  has_projects: boolean;         // Whether any projects were found
  projects: ProjectEntry[];      // Array of discovered projects
  skipped_srts: string[];        // SRT files that were skipped
  no_project_reason: string | null;  // Explanation if no projects found
}

interface ProjectEntry {
  // Identification
  id: string;                    // Unique ID (e.g., "proj_001")
  name: string;                  // Simple name from transcript
  synthesized_name: string;      // Full folder name (Project_XxxYyy)
  
  // Description
  description: string;           // 1-2 sentence description
  
  // Source files
  source_srts: string[];         // Relative paths to SRT files
  
  // Technical details
  tech_stack: string[];          // Detected technologies
  complexity: Complexity;        // Difficulty level
  
  // Generation tracking
  generation_status: GenerationStatus;
  generated_at: string | null;   // ISO 8601 timestamp when generated
  output_path: string | null;    // Path to generated project folder
}

type Complexity = "beginner" | "intermediate" | "advanced";

type GenerationStatus = 
  | "not_started"    // Discovery complete, not yet generated
  | "in_progress"    // Generation started
  | "complete"       // Successfully generated
  | "failed"         // Generation failed
  | "skipped";       // User chose to skip
```

## Field Specifications

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `course_path` | string | Yes | Absolute path to course directory |
| `discovered_at` | string | Yes | ISO 8601 timestamp (UTC) |
| `discovery_version` | string | Yes | Always "1.0" for this schema version |
| `has_projects` | boolean | Yes | `true` if projects array is non-empty |
| `projects` | array | Yes | Array of ProjectEntry (may be empty) |
| `skipped_srts` | array | Yes | Array of skipped file paths (may be empty) |
| `no_project_reason` | string\|null | Yes | Explanation if has_projects is false |

### Project Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier, format: `proj_XXX` |
| `name` | string | Yes | Human-readable name from transcript |
| `synthesized_name` | string | Yes | Folder name, format: `Project_XxxYyy` |
| `description` | string | Yes | 1-2 sentences describing the project |
| `source_srts` | string[] | Yes | Relative paths to source SRT files |
| `tech_stack` | string[] | Yes | Technologies used (may be empty) |
| `complexity` | string | Yes | One of: beginner, intermediate, advanced |
| `generation_status` | string | Yes | One of: not_started, in_progress, complete, failed, skipped |
| `generated_at` | string\|null | Yes | ISO 8601 timestamp or null |
| `output_path` | string\|null | Yes | Absolute path to generated folder or null |

## ID Generation

Project IDs follow the pattern `proj_XXX` where XXX is a zero-padded sequence number:

```
proj_001
proj_002
proj_003
...
proj_099
proj_100
```

IDs are assigned in order of discovery (first project found = proj_001).

## Path Handling

### course_path
- Must be absolute path
- Use forward slashes even on Windows
- No trailing slash

```
"/home/user/courses/ReactMasterclass"
"C:/Users/user/courses/ReactMasterclass"
```

### source_srts
- Relative to course_path
- Use forward slashes
- Include subfolder if applicable

```
["03_Todo.srt", "04_Todo.srt"]
["Module1/03_Todo.srt", "Module1/04_Todo.srt"]
```

### output_path
- Absolute path when generated
- null before generation

```
"/home/user/courses/ReactMasterclass/CODE/__CC_Projects/Project_ReactTodo"
```

## Timestamps

All timestamps use ISO 8601 format in UTC:

```
"2025-01-15T10:30:00.000Z"
```

## Example: Full Manifest

```json
{
  "course_path": "/home/user/courses/ReactMasterclass",
  "discovered_at": "2025-01-15T10:30:00.000Z",
  "discovery_version": "1.0",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "TodoApp",
      "synthesized_name": "Project_ReactTodoWithLocalStorage",
      "description": "A React-based todo application featuring local storage persistence, filtering, and a responsive design.",
      "source_srts": [
        "03_TodoApp_Part1.srt",
        "04_TodoApp_Part2.srt",
        "05_TodoApp_Part3.srt"
      ],
      "tech_stack": [
        "React",
        "JavaScript",
        "CSS",
        "LocalStorage"
      ],
      "complexity": "beginner",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    },
    {
      "id": "proj_002",
      "name": "AuthSystem",
      "synthesized_name": "Project_ReactAuthWithJWT",
      "description": "Complete authentication system with JWT access and refresh tokens, protected routes, and MongoDB user storage.",
      "source_srts": [
        "07_AuthSystem_Part1.srt",
        "08_AuthSystem_Part2.srt"
      ],
      "tech_stack": [
        "React",
        "Node.js",
        "Express",
        "JWT",
        "MongoDB"
      ],
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

## Example: No Projects

```json
{
  "course_path": "/home/user/courses/JavaScriptTheory",
  "discovered_at": "2025-01-15T11:00:00.000Z",
  "discovery_version": "1.0",
  "has_projects": false,
  "projects": [],
  "skipped_srts": [
    "01_WhatIsJS.srt",
    "02_Variables.srt",
    "03_Functions.srt",
    "04_Objects.srt",
    "05_Arrays.srt",
    "06_Summary.srt"
  ],
  "no_project_reason": "Course covers JavaScript fundamentals conceptually without building any complete applications. Content consists of isolated code snippets demonstrating language features."
}
```

## Example: After Generation

```json
{
  "course_path": "/home/user/courses/ReactMasterclass",
  "discovered_at": "2025-01-15T10:30:00.000Z",
  "discovery_version": "1.0",
  "has_projects": true,
  "projects": [
    {
      "id": "proj_001",
      "name": "TodoApp",
      "synthesized_name": "Project_ReactTodoWithLocalStorage",
      "description": "A React-based todo application...",
      "source_srts": ["03_TodoApp_Part1.srt", "04_TodoApp_Part2.srt", "05_TodoApp_Part3.srt"],
      "tech_stack": ["React", "JavaScript", "CSS", "LocalStorage"],
      "complexity": "beginner",
      "generation_status": "complete",
      "generated_at": "2025-01-15T10:35:00.000Z",
      "output_path": "/home/user/courses/ReactMasterclass/CODE/__CC_Projects/Project_ReactTodoWithLocalStorage"
    },
    {
      "id": "proj_002",
      "name": "AuthSystem",
      "synthesized_name": "Project_ReactAuthWithJWT",
      "description": "Complete authentication system...",
      "source_srts": ["07_AuthSystem_Part1.srt", "08_AuthSystem_Part2.srt"],
      "tech_stack": ["React", "Node.js", "Express", "JWT", "MongoDB"],
      "complexity": "intermediate",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    }
  ],
  "skipped_srts": ["01_Introduction.srt", "02_ReactBasics.srt", "06_StateTheory.srt", "09_Conclusion.srt"],
  "no_project_reason": null
}
```

## Validation Rules

### Required Validations

1. **course_path**: Must exist and be a directory
2. **projects array**: If has_projects is true, must be non-empty
3. **project IDs**: Must be unique within manifest
4. **source_srts**: Each file must exist relative to course_path
5. **synthesized_name**: Must match pattern `Project_[A-Z][a-zA-Z0-9]+`
6. **generation_status**: Must be valid enum value

### Consistency Rules

1. If `has_projects` is false, `projects` must be empty array
2. If `has_projects` is false, `no_project_reason` must be non-null string
3. If `generation_status` is "complete", `generated_at` and `output_path` must be non-null
4. If `generation_status` is "not_started", `generated_at` and `output_path` must be null

## File Location

The manifest file is always created at:

```
{course_path}/project-findings.json
```

This file should be committed to version control or preserved for future reference.
