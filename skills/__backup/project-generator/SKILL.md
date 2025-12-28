---
name: project-generator
description: Generate complete, working code projects from course transcript analysis. Use when you have a project specification (from discovery or manual input) and need to create all implementation files, documentation, and configuration. Triggers on phrases like "generate project", "create project from transcript", "build the project", "generate Project_XxxYyy".
---

# Project Generator Skill

Generate complete, functional code projects based on course transcript analysis and project specifications. Produces production-ready code with full documentation.

## When to Use

- After running project-discovery, to generate one or more discovered projects
- When given a project specification with source SRT files
- To generate specific projects by name or ID from existing manifest
- Any request to create/build/generate a project from transcripts

## Prerequisites

- Current working directory should be the course folder
- Either:
  - A `project-findings.json` manifest exists (from project-discovery), OR
  - User provides project specification directly

## Input Options

### Option 1: Generate from Manifest

If `project-findings.json` exists, user can request:

```
"Generate all projects"
"Generate proj_001"
"Generate Project_ReactTodoWithLocalStorage"
"Generate the TodoApp project"
```

### Option 2: Direct Specification

User provides project details directly:

```
"Generate a project called Project_MyApp from files 03.srt, 04.srt, 05.srt 
using React and TypeScript"
```

## Workflow

### Step 1: Load Project Specification

**If using manifest:**

1. Read `project-findings.json`
2. Find requested project(s) by id, synthesized_name, or name
3. Extract: synthesized_name, description, source_srts, tech_stack

**If direct specification:**

1. Parse user's request for project details
2. Validate source SRT files exist

### Step 2: Load Source Transcripts

Read the content of each SRT file in `source_srts`:

```javascript
for (const srtFile of project.source_srts) {
  const content = readFile(srtFile);
  // Analyze for implementation details
}
```

Extract from transcripts:
- Exact code patterns shown
- File structure discussed
- Features to implement
- Configuration requirements
- Dependencies mentioned

### Step 3: Create Project Structure

Create the output directory:

```
CODE/__CC_Projects/{synthesized_name}/
```

Standard structure:

```
Project_Name/
├── CLAUDE.md          # Claude context file
├── README.md          # User documentation
├── USAGE.md           # Usage guide
├── CHANGELOG.md       # Version history
├── [config files]     # package.json, tsconfig.json, etc.
└── [source dirs]      # src/, lib/, etc.
```

### Step 4: Generate Documentation Files

Create in this order:

#### 4.1 CLAUDE.md

```markdown
# Project: {synthesized_name}

## Overview
{description}

## Tech Stack
{tech_stack as list}

## Project Structure
{directory tree}

## Key Concepts Implemented
{concepts from course}

## Development Notes
{any important implementation notes}

## Original Source
Generated from course transcripts.
Source files: {source_srts}
```

#### 4.2 README.md

```markdown
# {Project Name}

{description}

## Features
{list of features}

## Prerequisites
{required software}

## Installation
{step-by-step installation}

## Running the Project
{how to run}

## Project Structure
{directory tree}

## Technologies Used
{tech_stack}

## License
MIT
```

#### 4.3 USAGE.md

```markdown
# Usage Guide

## Getting Started
{first steps}

## Features Walkthrough
{detailed feature explanations}

## Examples
{code/usage examples}

## Common Tasks
{how-to guides}

## Troubleshooting
{common issues and solutions}
```

#### 4.4 CHANGELOG.md

**CRITICAL: APPEND-ONLY BEHAVIOR**

Before writing:
1. Check if `CHANGELOG.md` exists at output path
2. If exists: Read content, prepend new entry after header
3. If not exists: Create new file

```markdown
# Changelog

==================================================
## [1.0.0] - {YYYY-MM-DD}

### Initial Release
- {feature 1}
- {feature 2}
- {feature 3}

### Technical Details
- Built with {tech_stack}
- Generated from course transcripts
==================================================
```

### Step 5: Generate Configuration Files

Based on detected tech stack:

#### JavaScript/Node.js

```json
// package.json
{
  "name": "{project-name-lowercase}",
  "version": "1.0.0",
  "description": "{description}",
  "main": "{entry point}",
  "scripts": {
    "start": "{start command}",
    "dev": "{dev command}",
    "build": "{build command}",
    "test": "{test command}"
  },
  "dependencies": {
    // Real dependencies with actual versions
  },
  "devDependencies": {
    // Real dev dependencies with actual versions
  }
}
```

#### TypeScript

Add `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### Python

Create `requirements.txt`:

```
flask==2.3.0
sqlalchemy==2.0.0
python-dotenv==1.0.0
```

Or `pyproject.toml` for modern projects.

#### React (Vite)

Include `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### Step 6: Generate Source Code

**CRITICAL REQUIREMENTS:**

1. **WORKING CODE ONLY**
   - No `// TODO: implement this` comments
   - No empty function bodies
   - No placeholder text
   - All imports must be valid

2. **COMPLETE IMPLEMENTATION**
   - Implement ALL features from transcripts
   - Follow patterns shown by instructor
   - Include proper error handling
   - Add input validation where needed

3. **CODE QUALITY**
   - Meaningful variable/function names
   - Consistent formatting
   - Logical file organization
   - Comments only for complex logic

### Step 7: Update Manifest

If working from `project-findings.json`, update the project entry:

```json
{
  "generation_status": "complete",
  "generated_at": "2025-01-15T10:35:00.000Z",
  "output_path": "/full/path/to/CODE/__CC_Projects/Project_Name"
}
```

If generation failed:

```json
{
  "generation_status": "failed",
  "generated_at": "2025-01-15T10:35:00.000Z",
  "output_path": null
}
```

### Step 8: Update Progress (If All Projects Done)

If all projects in manifest are now complete (or skipped/failed):

Update `progress.json`:

```json
{
  "status": "complete",
  "started_at": "{original start time}",
  "completed_at": "2025-01-15T10:40:00.000Z"
}
```

### Step 9: Report Results

```
## Generation Complete

**Project**: Project_ReactTodoWithLocalStorage
**Location**: CODE/__CC_Projects/Project_ReactTodoWithLocalStorage/
**Status**: Success

### Files Created (15)
- CLAUDE.md
- README.md
- USAGE.md
- CHANGELOG.md
- package.json
- vite.config.js
- src/main.jsx
- src/App.jsx
- src/components/TodoList.jsx
- src/components/TodoItem.jsx
- src/components/AddTodo.jsx
- src/hooks/useLocalStorage.js
- src/styles/App.css
- public/index.html
- .gitignore

### To Run
  cd CODE/__CC_Projects/Project_ReactTodoWithLocalStorage
  npm install
  npm run dev
```

## Generation Guidelines by Tech Stack

### React Projects

```
Project_ReactXxx/
├── public/
│   └── index.html
├── src/
│   ├── main.jsx (or index.js)
│   ├── App.jsx
│   ├── components/
│   │   └── [Component].jsx
│   ├── hooks/
│   │   └── use[Hook].js
│   ├── context/
│   │   └── [Name]Context.jsx
│   ├── services/
│   │   └── api.js
│   └── styles/
│       └── [name].css
├── package.json
├── vite.config.js (or webpack.config.js)
└── [docs]
```

### Node.js/Express Projects

```
Project_NodeXxx/
├── src/
│   ├── index.js (or app.js)
│   ├── routes/
│   │   └── [resource].js
│   ├── controllers/
│   │   └── [resource]Controller.js
│   ├── models/
│   │   └── [Model].js
│   ├── middleware/
│   │   └── [name].js
│   └── utils/
│       └── [helper].js
├── config/
│   └── database.js
├── package.json
├── .env.example
└── [docs]
```

### Python/Flask Projects

```
Project_PythonXxx/
├── app/
│   ├── __init__.py
│   ├── routes/
│   │   └── [resource].py
│   ├── models/
│   │   └── [model].py
│   └── templates/
│       └── [template].html
├── config.py
├── run.py
├── requirements.txt
└── [docs]
```

## Error Handling

### Partial Generation

If some files fail but others succeed:

1. Complete as much as possible
2. Log failed files with reasons
3. Set `generation_status` to "partial" (treat as "failed" for retry)
4. Return detailed error report

### Complete Failure

If generation cannot proceed:

1. Remove any partial files created
2. Set `generation_status` to "failed"
3. Return error explanation

## Reference Files

See `references/` folder for:
- `file-templates.md` - Complete templates for all documentation files
- `code-patterns.md` - Common code patterns by tech stack
