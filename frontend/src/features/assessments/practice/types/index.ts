export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Status = 'Not Attempted' | 'Attempted' | 'Solved';
export type PracticeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'go'
  | 'rust';

export type StarterCode = Partial<Record<PracticeLanguage, string>>;

export interface SampleTestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  acceptanceRate: number; // Mocked percentage
  status: Status;
  description: string;
  constraints: string[];
  starterCode: StarterCode;
  sampleTestCases: SampleTestCase[];
  testCases: TestCase[];
  hints: string[];
  explanation: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
