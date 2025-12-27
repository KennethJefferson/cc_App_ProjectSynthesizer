/**
 * Course-related type definitions
 */

export type CourseState = 
  | 'pending'       // Not yet processed
  | 'in_progress'   // Currently being processed  
  | 'complete'      // Successfully completed
  | 'skipped';      // Already complete, skipping

export interface Course {
  path: string;
  srtFiles: string[];
  state: CourseState;
  hasSubfolders: boolean;
}

export interface ProgressFile {
  status: 'started' | 'complete';
  started_at: string;
  completed_at: string | null;
}

export interface SrtFile {
  filename: string;
  content: string;
}

/**
 * Project entry in the manifest file
 */
export type GenerationStatus = 
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'failed'
  | 'skipped';

export type Complexity = 'beginner' | 'intermediate' | 'advanced';

export interface ProjectEntry {
  id: string;
  name: string;
  synthesized_name: string;
  description: string;
  source_srts: string[];
  tech_stack: string[];
  complexity: Complexity;
  generation_status: GenerationStatus;
  generated_at: string | null;
  output_path: string | null;
}

/**
 * Project findings manifest (project-findings.json)
 */
export interface ProjectFindingsManifest {
  course_path: string;
  discovered_at: string;
  discovery_version: string;
  has_projects: boolean;
  projects: ProjectEntry[];
  skipped_srts: string[];
  no_project_reason: string | null;
}

/**
 * Result from discovery phase
 */
export interface DiscoveryResult {
  has_projects: boolean;
  project_count: number;
  skipped_srts: string[];
  no_project_reason: string | null;
  manifest: ProjectFindingsManifest | null;
}

/**
 * Result from generating a single project
 */
export interface GeneratedProject {
  project_name: string;
  output_path: string;
  files_created: string[];
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

/**
 * Final result for a course
 */
export interface CourseResult {
  coursePath: string;
  status: 'complete' | 'no_projects' | 'failed';
  discovery: DiscoveryResult;
  projectsGenerated: GeneratedProject[];
  errors: string[];
  durationMs: number;
}
