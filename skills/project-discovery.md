# project-discovery

Analyze course transcript files to discover teachable code projects.

## Purpose

This skill scans course transcript files (.srt) and identifies hands-on coding projects that can be synthesized into working implementations.

## When to Use

- At the start of course processing
- When you need to identify what projects are taught in a course
- Before running project generation

## Capabilities

1. **Scan transcript files** - Find and read .srt files in course directories
2. **Identify projects** - Recognize hands-on coding projects vs theoretical content
3. **Map source files** - Track which transcripts belong to which project
4. **Classify complexity** - Beginner, intermediate, or advanced
5. **Detect tech stack** - Frameworks, languages, tools used

## Output

Creates two files in the course root:

### progress.json
```json
{
  "status": "started",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": null
}
```

### project-findings.json
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
      "source_srts": [
        "01 - Introduction.srt",
        "02 - Setup.srt",
        "03 - Database.srt"
      ],
      "tech_stack": ["Next.js", "TypeScript", "Prisma", "PostgreSQL"],
      "complexity": "advanced",
      "generation_status": "not_started",
      "generated_at": null,
      "output_path": null
    }
  ],
  "skipped_srts": [
    "00 - Course Overview.srt"
  ],
  "no_project_reason": null
}
```

## Discovery Process

1. **Glob for SRT files** - `**/*.srt` in course directory
2. **Sample strategically** - For large courses (50+ files), read representative samples
3. **Identify project boundaries** - Look for "let's build", "project setup", "final result"
4. **Group related transcripts** - Map lectures to specific projects
5. **Extract metadata** - Tech stack, complexity, description
6. **Write manifest** - Create project-findings.json

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

## Synthesized Name Format

Project names are formatted as: `Project_CamelCaseName`

Examples:
- "Job Portal" → `Project_JobPortal`
- "E-commerce Store with Stripe" → `Project_EcommerceStoreWithStripe`
- "React Native Weather App" → `Project_ReactNativeWeatherApp`

## Handling Large Courses

For courses with 50+ SRT files:
1. Read first and last files of each section
2. Sample every 3rd-5th file in the middle
3. Focus on files with project-indicative names
4. Skip obvious theory files (intro, conclusion, quiz)

## Important Notes

- **Don't generate code** - Discovery only identifies projects
- **Be conservative** - Only mark as project if there's clear hands-on content
- **Group correctly** - One project may span multiple lectures
- **Note gaps** - Projects may have intermissions with unrelated content
