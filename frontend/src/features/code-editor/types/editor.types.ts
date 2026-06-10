export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

export interface ExampleCase {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints: string[];
  examples: ExampleCase[];
}

export interface Submission {
  id: string;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Pending';
  submittedAt: string;
  runtime?: number; // in ms
  memory?: number; // in KB/MB
}

export interface ExecutionResult {
  status: 'Success' | 'Compile Error' | 'Runtime Error' | 'Wrong Answer';
  stdout?: string;
  stderr?: string;
  runtime?: number; // in ms
  memory?: number; // in KB/MB
  passedCount?: number;
  totalCount?: number;
}
