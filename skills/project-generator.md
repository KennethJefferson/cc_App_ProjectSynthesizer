# project-generator

Generate complete, working code projects from course transcript analysis.

## Purpose

This skill creates production-ready code implementations based on course transcripts. It supports two modes:
1. **Standard mode**: Full transcripts provided in prompt
2. **Chunked mode**: Architecture spec + partial transcripts for large projects

## When to Use

- After project discovery has identified a project in transcripts
- When you have transcript content ready for code generation
- In chunked mode, when an architecture spec is provided

## Capabilities

1. **Parse transcript content** - Extract code snippets, patterns, and implementation details
2. **Generate source files** - Create complete, working code files
3. **Follow tech stack** - Use specified frameworks, libraries, and patterns
4. **Create documentation** - README, USAGE, CHANGELOG files
5. **Handle dependencies** - Generate package.json with correct versions

## Output Location

All files are created in: `{course_path}/CODE/__CC_Projects/{ProjectName}/`

## Standard Mode

When receiving full transcripts:
1. Read all provided transcript content
2. Extract implementation details in teaching order
3. Generate all project files
4. Create documentation

## Chunked Mode

When an architecture spec is provided:
1. Reference the spec for file structure and patterns
2. Generate only files covered in the current chunk
3. Use proper imports even for files not yet created
4. Add TODO comments for parts in later chunks
5. Maintain consistency with previously generated files

### Chunked Mode Indicators

You're in chunked mode when the prompt includes:
- "Chunk X of Y" in the title
- "Architecture Spec (Reference)" section
- "Files Already Generated" list
- "Remaining Files to Generate" list

### Chunked Mode Rules

1. **Follow the spec** - Use exact file paths, names, and patterns from the architecture spec
2. **Check generated files** - Don't recreate files in the "Already Generated" list
3. **Prioritize build order** - Generate files in the order suggested by the spec
4. **Handle dependencies** - Import from files that will be created in other chunks
5. **Add TODO markers** - For functionality that will come from later chunks

## File Generation Guidelines

### Source Files
- Use TypeScript where applicable
- Include proper type definitions
- Add JSDoc comments for complex functions
- Follow the patterns identified in the architecture spec

### Configuration Files
- `package.json` - Include all dependencies with versions
- `tsconfig.json` - Proper TypeScript configuration
- `.env.example` - Document required environment variables
- `.gitignore` - Standard ignores for the tech stack

### Documentation
- `README.md` - Project overview, setup instructions, features
- `USAGE.md` - Detailed usage examples
- `CHANGELOG.md` - Version history
- `CLAUDE.md` - Instructions for AI assistants working on the project

## Example Output Structure

```
Project_AdvancedJobPortal/
├── README.md
├── USAGE.md
├── CHANGELOG.md
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── route.ts
│   ├── components/
│   │   ├── ui/
│   │   └── forms/
│   ├── lib/
│   │   ├── db.ts
│   │   └── auth.ts
│   └── models/
│       └── index.ts
└── public/
    └── ...
```

## Important Notes

- **Never modify source transcripts** - Only read them
- **Write to __CC_Projects only** - All output goes in the designated folder
- **Complete implementations** - Don't leave placeholder code unless in chunked mode
- **Working code** - Generated code should be runnable after `npm install`
- **Follow teaching order** - Implement features in the order they're taught
