# File Templates Reference

Complete templates for all required documentation files.

## CLAUDE.md Template

This file provides context for future Claude Code sessions working on this project.

```markdown
# Project: {synthesized_name}

## Overview

{2-3 sentence description of what this project does and its main purpose}

## Tech Stack

- **Language**: {Primary language - JavaScript, TypeScript, Python, etc.}
- **Framework**: {Main framework - React, Express, Flask, etc.}
- **Database**: {If applicable - PostgreSQL, MongoDB, etc.}
- **Key Libraries**: 
  - {library1} - {what it's used for}
  - {library2} - {what it's used for}

## Project Structure

```
{synthesized_name}/
├── {folder1}/
│   ├── {file1}
│   └── {file2}
├── {folder2}/
│   └── {file3}
├── {config_file}
└── {entry_point}
```

## Key Concepts Implemented

This project demonstrates the following concepts from the course:

1. **{Concept 1}**: {Brief explanation of how it's implemented}
2. **{Concept 2}**: {Brief explanation of how it's implemented}
3. **{Concept 3}**: {Brief explanation of how it's implemented}

## Architecture Notes

{Describe the overall architecture - e.g., component hierarchy, API structure, data flow}

### Data Flow

{Explain how data moves through the application}

### State Management

{Explain state management approach if applicable}

## Development Notes

### Running Locally

```bash
{commands to run the project}
```

### Environment Variables

{List any required environment variables}

### Common Tasks

- **{Task 1}**: {How to do it}
- **{Task 2}**: {How to do it}

## Known Limitations

{Any limitations or areas that could be improved}

## Original Source

This project was generated from course transcripts by Project Synthesizer.

- **Source Files**: {comma-separated list of SRT files}
- **Generated**: {timestamp}
- **Course Path**: {original course path}
```

---

## README.md Template

User-facing documentation for the project.

```markdown
# {Project Display Name}

{One paragraph description of what this project does}

## Features

- ✅ {Feature 1}
- ✅ {Feature 2}
- ✅ {Feature 3}
- ✅ {Feature 4}

## Demo

{If applicable, describe how to see a demo or include screenshot placeholder}

## Prerequisites

Before running this project, ensure you have:

- {Prerequisite 1} (version X.X or higher)
- {Prerequisite 2}
- {Prerequisite 3}

## Installation

1. Clone or navigate to the project directory:
   ```bash
   cd {project-folder-name}
   ```

2. Install dependencies:
   ```bash
   {install command - npm install, pip install -r requirements.txt, etc.}
   ```

3. {Any additional setup steps}:
   ```bash
   {commands}
   ```

## Configuration

{If environment variables or config needed}

Create a `.env` file in the root directory:

```env
{VAR_NAME}={description or example value}
{VAR_NAME_2}={description or example value}
```

## Running the Project

### Development Mode

```bash
{dev command}
```

The application will be available at `http://localhost:{port}`

### Production Build

```bash
{build command}
{serve command}
```

## Project Structure

```
{project-name}/
├── {folder}/           # {description}
│   ├── {file}          # {description}
│   └── {file}          # {description}
├── {folder}/           # {description}
├── {config-file}       # {description}
└── {entry-file}        # {description}
```

## Usage

{Brief usage instructions - see USAGE.md for detailed guide}

### Basic Example

```{language}
{code example}
```

## API Reference

{If applicable, list main endpoints or functions}

| Endpoint/Function | Description |
|-------------------|-------------|
| `{endpoint}` | {description} |
| `{endpoint}` | {description} |

## Technologies Used

| Technology | Purpose |
|------------|---------|
| {Tech 1} | {What it's used for} |
| {Tech 2} | {What it's used for} |
| {Tech 3} | {What it's used for} |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Generated from course content using Project Synthesizer
- {Any other acknowledgments}
```

---

## USAGE.md Template

Detailed usage guide with examples.

```markdown
# Usage Guide

Comprehensive guide for using {Project Name}.

## Table of Contents

- [Getting Started](#getting-started)
- [Features Walkthrough](#features-walkthrough)
- [Examples](#examples)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Getting Started

### First Launch

After installation, start the application:

```bash
{start command}
```

{Describe what the user sees on first launch}

### Initial Setup

{Any first-time setup steps}

## Features Walkthrough

### {Feature 1 Name}

{Detailed explanation of the feature}

**How to use:**

1. {Step 1}
2. {Step 2}
3. {Step 3}

{Screenshot or code example if helpful}

### {Feature 2 Name}

{Detailed explanation of the feature}

**How to use:**

1. {Step 1}
2. {Step 2}

### {Feature 3 Name}

{Detailed explanation}

## Examples

### Example 1: {Use Case Title}

{Describe the scenario}

```{language}
{Code or commands}
```

**Expected Result:**

{What should happen}

### Example 2: {Use Case Title}

{Describe the scenario}

```{language}
{Code or commands}
```

### Example 3: {Use Case Title}

{Describe the scenario}

## Common Tasks

### How to {Task 1}

```{language}
{Code or steps}
```

### How to {Task 2}

```{language}
{Code or steps}
```

### How to {Task 3}

{Steps or explanation}

## Troubleshooting

### {Common Issue 1}

**Symptoms:**
- {Symptom 1}
- {Symptom 2}

**Cause:** {Why this happens}

**Solution:**

```bash
{Fix commands or steps}
```

### {Common Issue 2}

**Symptoms:**
- {Symptom}

**Solution:**

{How to fix}

### {Common Issue 3}

**Problem:** {Description}

**Solution:** {Fix}

## FAQ

### Q: {Common question 1}?

A: {Answer}

### Q: {Common question 2}?

A: {Answer}

### Q: {Common question 3}?

A: {Answer}

## Advanced Usage

### {Advanced Topic 1}

{Detailed explanation for power users}

### {Advanced Topic 2}

{Detailed explanation}

## Getting Help

If you encounter issues not covered here:

1. Check the README.md for basic setup issues
2. Review the code comments for implementation details
3. {Any other help resources}
```

---

## CHANGELOG.md Template

Version history with append-only structure.

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

==================================================
## [1.0.0] - {YYYY-MM-DD}

### Initial Release

#### Added
- {Main feature 1}
- {Main feature 2}
- {Main feature 3}
- {Main feature 4}

#### Technical Details
- Built with {primary framework/language}
- {Key technical decision 1}
- {Key technical decision 2}

#### Documentation
- CLAUDE.md for Claude Code context
- README.md with installation and usage
- USAGE.md with detailed guide

#### Source
- Generated from course transcripts
- Source files: {list of SRT files}
==================================================
```

### Appending New Entries

When updating an existing project, prepend new entries:

```markdown
==================================================
## [1.1.0] - {YYYY-MM-DD}

### Added
- {New feature}

### Changed
- {Modified behavior}

### Fixed
- {Bug fix}
==================================================

==================================================
## [1.0.0] - {original date}
...existing content...
==================================================
```

---

## .gitignore Template

Standard ignores by tech stack.

### Node.js / JavaScript

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# Misc
*.tmp
*.temp
```

### Python

```gitignore
# Byte-compiled
__pycache__/
*.py[cod]
*$py.class

# Virtual environments
venv/
env/
.env

# Distribution
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp

# Testing
.pytest_cache/
.coverage
htmlcov/

# Misc
*.log
.DS_Store
```

### React (Vite)

```gitignore
# Dependencies
node_modules/

# Build
dist/
dist-ssr/

# Environment
.env
.env.local
.env.*.local

# Logs
*.log

# IDE
.vscode/*
!.vscode/extensions.json
.idea/

# OS
.DS_Store

# Testing
coverage/
```

---

## .env.example Template

```env
# Application
NODE_ENV=development
PORT=3000

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication (if applicable)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# External APIs (if applicable)
API_KEY=your-api-key-here

# Add descriptions for each variable
# to help developers understand what's needed
```
