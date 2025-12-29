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
  name: string;
  srtFiles: string[];
  state: CourseState;
  hasSubfolders: boolean;
}

export interface ProgressFile {
  status: 'started' | 'complete' | 'completed';
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
 * GitHub push status for generated projects
 */
export interface GitHubStatus {
  status: 'pushed' | 'skipped' | 'failed';
  repo_url?: string;
  error?: string;
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
  github?: GitHubStatus;
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

/**
 * Architecture spec for large projects (produced by project-architect skill)
 * Acts as compressed knowledge that persists across generation chunks
 */
export interface ArchitectureSpec {
  project_name: string;
  synthesized_name: string;
  description: string;
  tech_stack: string[];

  /** Package dependencies with versions */
  dependencies: Record<string, string>;

  /** Dev dependencies with versions */
  dev_dependencies: Record<string, string>;

  /** Complete file structure to be created */
  file_structure: FileSpec[];

  /** Data models/schemas identified */
  data_models: DataModelSpec[];

  /** API routes/endpoints */
  api_routes: ApiRouteSpec[];

  /** UI components */
  components: ComponentSpec[];

  /** Key implementation patterns observed in the teaching */
  key_patterns: string[];

  /** Suggested build order for files */
  build_order: string[];

  /** Environment variables needed */
  env_vars: string[];

  /** Additional context/notes for the generator */
  implementation_notes: string[];
}

export interface FileSpec {
  path: string;
  purpose: string;
  /** Key exports or functionality */
  exports?: string[];
}

export interface DataModelSpec {
  name: string;
  /** 'prisma' | 'mongoose' | 'typeorm' | 'drizzle' | 'plain' */
  orm_type: string;
  fields: FieldSpec[];
  relations?: string[];
}

export interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
  default?: string;
}

export interface ApiRouteSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  /** Request body schema if applicable */
  request_body?: string;
  /** Response shape */
  response?: string;
}

export interface ComponentSpec {
  name: string;
  type: 'page' | 'layout' | 'component' | 'hook' | 'context' | 'util';
  props?: string[];
  /** Components this depends on */
  dependencies?: string[];
}

/**
 * Result from architecture extraction phase
 */
export interface ArchitectResult {
  success: boolean;
  spec: ArchitectureSpec | null;
  error: string | null;
  /** Path to the saved spec file */
  spec_path: string | null;
}

/**
 * Chunk info for large project generation
 */
export interface SrtChunk {
  index: number;
  total: number;
  srts: SrtFile[];
  /** Overlap SRTs from previous chunk for context continuity */
  overlap_from_previous: string[];
}
