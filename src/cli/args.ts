/**
 * CLI argument parsing
 */

export interface CLIArgs {
  input: string | null;      // -i: Input directory
  recursive: boolean;        // -r: Recursive scanning
  concurrency: number;       // -c: Number of concurrent workers
  scanWorkers: number;       // -s: Number of scan workers
  help: boolean;             // --help: Show help
  version: boolean;          // --version: Show version
}

export function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    input: null,
    recursive: false,
    concurrency: 5,
    scanWorkers: 3,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-i':
      case '--input':
        args.input = argv[++i];
        break;

      case '-r':
      case '--recursive':
        args.recursive = true;
        break;

      case '-c':
      case '--concurrency':
        const concurrency = parseInt(argv[++i], 10);
        if (!isNaN(concurrency) && concurrency > 0) {
          args.concurrency = concurrency;
        }
        break;

      case '-s':
      case '--scan-workers':
        const scanWorkers = parseInt(argv[++i], 10);
        if (!isNaN(scanWorkers) && scanWorkers > 0) {
          args.scanWorkers = scanWorkers;
        }
        break;

      case '-h':
      case '--help':
        args.help = true;
        break;

      case '-v':
      case '--version':
        args.version = true;
        break;

      default:
        // If it's not a flag and input is not set, treat it as input
        if (!arg.startsWith('-') && !args.input) {
          args.input = arg;
        }
        break;
    }
  }

  // -s only works with -r
  if (!args.recursive) {
    args.scanWorkers = 1;
  }

  return args;
}

export function printHelp(): void {
  console.log(`
CCProjectSynth - Synthesize projects from course transcripts

USAGE:
  bun start -- [OPTIONS]
  ccprojectsynth [OPTIONS]

OPTIONS:
  -i, --input <path>       Input directory to scan for courses (required)
  -r, --recursive          Recursively scan for courses in subdirectories
  -c, --concurrency <n>    Number of concurrent course workers (default: 5)
  -s, --scan-workers <n>   Number of parallel scan workers (default: 3)
                           Only effective with -r flag
  -h, --help               Show this help message
  -v, --version            Show version

EXAMPLES:
  # Process a single course folder
  bun start -- -i "/path/to/course"

  # Process all courses in a directory recursively
  bun start -- -i "/path/to/courses" -r

  # Process with 10 concurrent workers
  bun start -- -i "/path/to/courses" -r -c 10

  # Process with custom concurrency and scan workers
  bun start -- -i "/path/to/courses" -r -c 10 -s 5

GRACEFUL SHUTDOWN:
  Press Ctrl+C once to stop accepting new courses and wait for
  current workers to complete their courses.
  
  Press Ctrl+C twice to force immediate exit (may leave courses
  in incomplete state).

OUTPUT:
  Each course will have:
  - progress.json: Status tracking file
  - CODE/__CC_Projects/: Generated project folders
  - error.log: In input directory, logs any failures
`);
}

export function printVersion(): void {
  console.log('CCProjectSynth v1.0.0');
}
