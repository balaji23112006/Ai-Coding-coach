import { Language, SubmissionStatus } from '@prisma/client';
export { Language, SubmissionStatus };

export type RunnerLanguage = 'javascript' | 'python';

export interface CodeExecutionPayload {
  language: RunnerLanguage;
  sourceCode: string;
  userId?: string;
}

export interface CodeExecutionResult {
  success: boolean;
  status: SubmissionStatus;
  stdout: string;
  stderr: string;
  executionTime: number; // in milliseconds
  memoryUsed: number; // in bytes
  outputTruncated: boolean;
}

export interface ICodeRunner {
  run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult>;
}

export function mapStringToLanguage(langStr: string): Language {
  switch (langStr.toLowerCase()) {
    case 'javascript':
      return Language.JAVASCRIPT;
    case 'python':
      return Language.PYTHON;
    default:
      throw new Error(`Unsupported language: ${langStr}`);
  }
}

export function mapLanguageToString(lang: Language): RunnerLanguage {
  switch (lang) {
    case Language.JAVASCRIPT:
      return 'javascript';
    case Language.PYTHON:
      return 'python';
  }
}
