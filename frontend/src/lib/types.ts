export type Role = 'user' | 'moderator' | 'admin';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SubmissionStatus =
  | 'queued' | 'judging' | 'accepted' | 'wrong_answer'
  | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error'
  | 'compilation_error' | 'internal_error' | 'skipped';
export interface User { id: string; username: string; email: string; role: Role; }
export interface AuthResponse { user: User; accessToken: string; refreshToken: string; }
export interface Language { id: string; name: string; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface Paged<T> { data: T[]; pagination: Pagination; }
export interface ProblemSummary {
  id: string; slug: string; title: string; difficulty: Difficulty;
  time_limit_ms: number; memory_limit_mb: number; is_public: boolean;
  created_by: string | null; created_at: string; updated_at: string;
}
export interface Problem extends ProblemSummary {
  statement: string; input_format: string | null;
  output_format: string | null; constraints: string | null;
}
export interface Submission {
  id: string; user_id: string; problem_id: string; language_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  submitted_at: string; completed_at: string | null; source_code?: string;
}
export interface TestResult {
  id: string; submission_id: string; test_case_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  stdout: string | null; stderr: string | null;
}
export interface TestCase {
  id: string; problem_id: string; input: string; expected_output: string;
  is_visible: boolean; order_index: number;
}
export const TERMINAL_STATUSES: SubmissionStatus[] = [
  'accepted','wrong_answer','time_limit_exceeded','memory_limit_exceeded',
  'runtime_error','compilation_error','internal_error',
];
export const isTerminal = (s: SubmissionStatus) => TERMINAL_STATUSES.includes(s);
