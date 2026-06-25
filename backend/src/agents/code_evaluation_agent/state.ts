import { Annotation } from '@langchain/langgraph';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  allPassed: boolean;
  results: Array<{
    testCase: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error: string | null;
  }>;
}

export interface BugReport {
  hasBugs: boolean;
  bugCount: number;
  bugs: Array<{
    type: 'runtime_error' | 'logic_error' | 'static_warning';
    message: string;
    line?: number;
    hint: string;
  }>;
}

export interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal: boolean | null;
  suggestion: string | null;
}

export interface QualityResult {
  qualityScore: number;
  grade: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  issues: string[];
  feedback: string[];
}

export const StateAnnotation = Annotation.Root({
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  problemId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  submittedCode: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  testCases: Annotation<Array<{ input: string; expectedOutput: string }>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  trigger: Annotation<'run' | 'submit'>({
    reducer: (x, y) => y ?? x,
    default: () => 'run',
  }),
  language: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'javascript',
  }),
  execResult: Annotation<ExecResult | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  testResults: Annotation<TestResults | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  bugReport: Annotation<BugReport | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  complexity: Annotation<ComplexityResult | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  qualityReview: Annotation<QualityResult | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  evalScore: Annotation<number | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  verdict: Annotation<'Pass' | 'Partial Pass' | 'Fail' | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  feedback: Annotation<string[] | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

export type AgentState = typeof StateAnnotation.State;
