/**
 * Mentor Agent Types
 * Defines the request/response shapes and internal workflow types
 * for the full Socratic mentor agentic workflow.
 */

export type ErrorCategory = 'syntax' | 'logic' | 'timeout' | 'request';

export type HintLevel = 1 | 2 | 3 | 4 | 5;

export interface HintRecord {
  id: string;
  userId: string;
  questionId: string;
  category: ErrorCategory;
  level: HintLevel;
  targetedConcept: string;
  feedback: string;
  timestamp: string;
}

export interface MentorRequest {
  /** User identifier (optional for anonymous users) */
  userId?: string;
  /** Question/problem identifier */
  questionId?: string;
  /** The student's current source code */
  sourceCode: string;
  /** Programming language */
  language: 'javascript' | 'python' | string;
  /** Result from code execution (stdout, stderr, status) */
  executionResult?: {
    status?: string;
    stdout?: string;
    stderr?: string;
    executionTime?: number;
  };
  /** Previous chat messages for context */
  messages?: Array<{ role: 'user' | 'bot'; text: string }>;
  /** What triggered this mentor request */
  triggerEvent?:
    | 'compile_error'
    | 'runtime_error'
    | 'test_fail'
    | 'timeout'
    | 'hint_request'
    | 'chat';
  /** Optional free-form question from the user */
  userQuestion?: string;
}

export interface HintMetadata {
  category: ErrorCategory;
  level: HintLevel;
  targetedConcept: string;
}

export interface MentorResponse {
  mentorFeedback: string;
  hintMetadata: HintMetadata;
  workflow: {
    triggeredBy: MentorRequest['triggerEvent'];
    savedAt: string;
    providerPreference: string[];
  };
}
