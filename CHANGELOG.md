# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2025-12-29

### Removed

- **Terminal User Interface (TUI)**: Removed OpenTUI/SolidJS-based TUI in favor of simple console output
  - Deleted entire `src/cli/tui/` directory (23 files)
  - Removed `@opentui/core`, `@opentui/solid`, and `solid-js` dependencies
  - Removed `@types/babel__core` dev dependency
  - Removed JSX configuration from `tsconfig.json`
  - Removed solid plugin from build script
  - Deleted `scripts/debug-tui.ts`

### Changed

- Replaced TUI with console-based progress logging
  - Worker status updates printed to console
  - GitHub integration status displayed in console
  - Graceful shutdown messages shown in console
- Simplified build process (no JSX transformation needed)

### Technical Details

- Reduced bundle size by removing SolidJS and OpenTUI dependencies
- Simplified `src/cli/commands.ts` with `setupConsoleLogging()` function
- Event system (`src/worker/events.ts`) retained for internal communication

## [1.2.0] - 2025-12-29

### Added

- **Automatic GitHub Integration**: Projects are automatically pushed to GitHub after generation
  - Creates public repositories with `ccg_` prefix naming convention
  - Auto-generates repo description: "Auto-generated from course transcripts by CCProjectSynth"
  - Graceful fallback: Shows yellow warning if GitHub CLI not installed or not authenticated
  - New TUI events for GitHub status: `worker:github:start`, `worker:github:complete`, `worker:github:skipped`, `worker:github:failed`
- New `github` field in `GeneratedProject` type tracking push status and repo URL
- New `GitHubStatus` interface for tracking GitHub push results

### Technical Details

- Uses `gh-repo` skill workflow: check auth → git init → commit → create repo → push
- Repo naming: strips `Project_` prefix, adds `ccg_` prefix (e.g., `Project_ReactTodoApp` → `ccg_ReactTodoApp`)
- New helper functions in `src/agent/client.ts`: `runGitHubIntegration()`, `convertToRepoName()`, `execCommand()`

## [1.1.0] - 2025-12-27

### Added

- **Terminal User Interface (TUI)**: Real-time dashboard built with OpenTUI and SolidJS
  - Header panel showing application name, phase status, and elapsed time
  - Progress bar with completion percentage and course statistics
  - Worker grid displaying real-time status for each concurrent worker
  - Recent activity feed showing last completed/failed courses
  - Metrics panel with average time, success rate, and ETA
- Event system (`src/worker/events.ts`) bridging worker pool to TUI
- Theme system with violet/purple primary colors
- Phase tracking: Scanning → Processing → Complete → Shutdown

### Technical Details

- Added OpenTUI dependencies: `@opentui/core`, `@opentui/solid`, `solid-js`
- TUI components use SolidJS reactive signals for efficient updates
- Events flow: Workers → EventEmitter → SynthContext → UI Components
- Build script updated with SolidJS plugin (`scripts/build.mjs`)

## [1.0.0] - 2025-12-27

### Added

- Initial release of CCProjectSynth
- Two-skill pipeline architecture using Claude Agent SDK
  - `project-discovery` skill for analyzing SRT transcripts
  - `project-generator` skill for creating complete project implementations
- CLI interface with the following options:
  - `-i, --input`: Specify input directory (required)
  - `-r, --recursive`: Enable recursive course scanning
  - `-c, --concurrency`: Set number of concurrent workers (default: 5)
  - `-s, --scan-workers`: Set number of scan workers (default: 3)
  - `-h, --help`: Display help message
  - `-v, --version`: Display version
- Concurrent course processing with configurable worker pool
- Parallel project generation within each course
- Persistent manifest system (`project-findings.json`) for:
  - Reviewing discovered projects before generation
  - Tracking generation status per project
  - Enabling selective regeneration
- Course state detection and resume support:
  - Automatic skip of completed courses
  - Clean restart for interrupted courses
  - Fresh processing for new courses
- Graceful shutdown handling:
  - Single Ctrl+C: Complete current work then exit
  - Double Ctrl+C: Force immediate exit
- Natural sort ordering for SRT files
- Error logging to `error.log` in input directory
- Debug mode via `DEBUG=1` environment variable
- Generated project documentation:
  - CLAUDE.md for future Claude Code sessions
  - README.md with project overview
  - USAGE.md with usage instructions
  - CHANGELOG.md for version history

### Technical Details

- Built with Bun >= 1.0.0
- Uses `@anthropic-ai/claude-agent-sdk` for agent orchestration
- TypeScript with strict mode enabled
- ESM module format

[Unreleased]: https://github.com/user/ccprojectsynth/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/user/ccprojectsynth/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/user/ccprojectsynth/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/ccprojectsynth/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/user/ccprojectsynth/releases/tag/v1.0.0
