import type { Difficulty, Question, TestCase } from '@/features/practice/types';

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';
export type EditorLanguage = SupportedLanguage;
export type EditorDifficulty = Difficulty;

export interface ExampleCase {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

export interface EditorProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  acceptance: number;
  description: string;
  constraints: string[];
  examples: ExampleCase[];
  hints: string[];
  explanation: string;
  testCases: TestCase[];
  templates: Partial<Record<SupportedLanguage, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export type Problem = EditorProblem;

export interface FailedTestCase {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: string;
  errorMessage?: string;
}

export interface Submission {
  id: string;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  status:
    | 'Accepted'
    | 'Wrong Answer'
    | 'Time Limit Exceeded'
    | 'Runtime Error'
    | 'Pending'
    | 'Compile Error';
  submittedAt: string;
  stdout?: string;
  runtime?: number;
  memory?: number;
  passedCount?: number;
  totalCount?: number;
  failedCases?: FailedTestCase[];
  stderr?: string;
}

export type SubmissionStatus = Submission['status'];
export type SubmissionResult = Submission;

export interface ExecutionResult {
  status: 'Success' | 'Compile Error' | 'Runtime Error' | 'Wrong Answer' | 'Time Limit Exceeded';
  stdout?: string;
  stderr?: string;
  runtime?: number;
  memory?: number;
  passedCount?: number;
  totalCount?: number;
  failedCases?: FailedTestCase[];
}

export interface CodeExecutionRequest {
  problemId: string;
  language: SupportedLanguage;
  code: string;
}

export function toEditorProblem(question: Question): EditorProblem {
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    difficulty: question.difficulty,
    topics: question.topics,
    acceptance: question.acceptanceRate,
    description: question.description,
    constraints: question.constraints,
    examples: question.sampleTestCases.map((testCase, index) => ({
      id: index + 1,
      input: testCase.input,
      output: testCase.output,
      explanation: testCase.explanation,
    })),
    hints: question.hints,
    explanation: question.explanation,
    testCases: question.testCases,
    templates: {
      javascript: question.starterCode.javascript,
      typescript: question.starterCode.typescript,
      python: question.starterCode.python,
      java: question.starterCode.java,
      cpp: question.starterCode.cpp,
    },
    timeLimitMs: question.timeLimitMs,
    memoryLimitMb: question.memoryLimitMb,
  };
}
