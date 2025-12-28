# Discovery Patterns Reference

Detailed patterns and heuristics for identifying projects in course transcripts.

## SRT File Format

SRT files follow this structure:

```
1
00:00:01,000 --> 00:00:04,500
Welcome to this course on React development.

2
00:00:04,600 --> 00:00:08,200
Today we'll learn how to build modern web applications.
```

When analyzing, focus on the **text content** (lines 3, 6, etc.), not the timestamps or sequence numbers.

## Project Start Indicators

### Explicit Start Phrases

High-confidence indicators that a project is beginning:

```
"Let's build a [X]"
"We're going to create [X]"
"Let's start a new project"
"Create a new [React/Vue/Node] application"
"Let's make a [X] from scratch"
"Time to build our [X]"
"We'll be building [X]"
"Our project will be [X]"
"Initialize a new project"
```

### Command-Based Indicators

Project initialization commands:

```
"npm init"
"npx create-react-app"
"npx create-next-app"
"vue create"
"django-admin startproject"
"flask run"
"cargo new"
"go mod init"
"mkdir [project-name] && cd"
```

### File Creation Indicators

When instructor starts creating project files:

```
"Create a new file called [X]"
"Let's create our main [component/file]"
"Open your editor and create [X]"
"First file we need is [X]"
"Start with [index.js/app.py/main.go]"
```

### Architecture Discussion

When instructor outlines what they'll build:

```
"Our application will have [X] components"
"The architecture will be..."
"We'll structure this as..."
"Here's what we're building today"
"Our app will include these features"
```

## Project Continuation Indicators

### Explicit Continuation

```
"Continuing from where we left off"
"Let's pick up where we stopped"
"Back to our [project name]"
"Resuming our [X] application"
"Now let's add to our [X]"
"Building on what we have"
```

### Reference to Previous Code

```
"Remember the [component/function] we created"
"In the [file] we made earlier"
"Using our existing [X]"
"The [X] we built last time"
"Open the [file] from before"
"Looking at our [component]"
```

### Feature Addition

```
"Let's add [feature] to our app"
"Now we'll implement [X]"
"Next feature is [X]"
"Extending our [X] with [Y]"
"Adding [X] functionality"
```

### Same Context Clues

- Same variable/function/component names mentioned
- Same file names referenced
- Consistent application domain (e.g., still talking about "todos", "users", "posts")

## Project End Indicators

### Explicit Completion

```
"That completes our [X]"
"We've finished building [X]"
"Our [X] is now complete"
"That wraps up [X]"
"[X] is done"
"Congratulations, you've built [X]"
```

### Summary/Recap

```
"Let's recap what we built"
"To summarize our [X]"
"Looking back at our [X]"
"We've covered [X]"
"Review of what we created"
```

### Transition Away

```
"Now let's move on to something different"
"In the next section, we'll start fresh"
"Let's switch gears"
"Moving on from [X]"
"That's it for [X], now..."
```

## Non-Project Content (Skip)

### By Filename Pattern

Files likely to be non-project content:

```
*[Ii]ntro*.srt
*[Ww]elcome*.srt
*[Oo]verview*.srt
*[Ss]ummary*.srt
*[Cc]onclusion*.srt
*[Ww]rap*.srt
*[Qq]uiz*.srt
*[Aa]ssessment*.srt
*[Tt]est*.srt
*[Ss]etup*.srt (unless project-specific)
*[Ii]nstall*.srt (unless project-specific)
```

### By Content Pattern

Skip content that is:

**Pure Theory:**
```
"The concept of [X] is..."
"[X] works by..."
"Understanding [X]"
"The theory behind [X]"
"What is [X]?"
"[X] explained"
```

**Tool/Environment Setup:**
```
"Installing [IDE/tool]"
"Setting up your environment"
"Configuring [X]"
"Download and install"
"System requirements"
```

**Course Logistics:**
```
"Welcome to the course"
"In this course, you'll learn"
"Course outline"
"What you'll need"
"How to use this course"
"Prerequisites"
```

**Assessments:**
```
"Quiz time"
"Test your knowledge"
"Assessment"
"Practice questions"
"Review questions"
```

## Edge Cases

### Mini-Examples vs Projects

**Skip** brief code examples that illustrate a concept:
- Under 3 minutes of coding
- No file structure
- "Quick example" or "simple demo"
- Isolated snippet not part of larger app

**Include** substantial examples that build something:
- Has actual file structure
- Could be run independently
- Multiple related pieces of code

### Multi-Part Projects

When a project spans multiple files:

```
Module 1/
├── 03_TodoPart1.srt    → Project STARTS
├── 04_TodoPart2.srt    → Project CONTINUES
└── 05_TodoPart3.srt    → Project ENDS

Combined into single project with source_srts:
["Module 1/03_TodoPart1.srt", "Module 1/04_TodoPart2.srt", "Module 1/05_TodoPart3.srt"]
```

### Interleaved Content

When theory is sandwiched in a project:

```
03_BuildingUI.srt       → Project A
04_ReactTheory.srt      → Theory (no new code)
05_MoreUI.srt           → Project A continues
```

**Decision**: Include theory file in project's source_srts (context is valuable) but note it contains theory.

### Refactoring Sessions

When instructor refactors previous code:

```
"Let's refactor our [X]"
"Improving our [X] code"
"Better way to write [X]"
```

This is a **continuation** of the existing project, not a new project.

## Confidence Scoring (Internal)

When uncertain, use this mental model:

| Confidence | Action |
|------------|--------|
| High (80%+) | Include/exclude definitively |
| Medium (50-80%) | Include with note in description |
| Low (<50%) | Lean toward including if it has code |

**When in doubt**: Include the SRT in the nearest project's source_srts. Extra context rarely hurts generation quality.

## Cross-Reference Validation

After initial pass, validate:

1. **No orphaned files**: Every SRT should be either in a project or skipped list
2. **Continuous projects**: source_srts should be adjacent (no gaps unless clearly separate)
3. **Reasonable scope**: Projects shouldn't span entire course unless it's truly one big project
4. **Tech stack consistency**: A single project shouldn't mix incompatible stacks (e.g., React and Vue)
