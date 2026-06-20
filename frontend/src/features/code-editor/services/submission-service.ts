import type { ExecutionResult, Submission, SupportedLanguage } from '../types/editor-types';

// Exposed backend API endpoints for code-editor integration:
// POST /api/code/run                    -> run code against visible sample test cases
// POST /api/code/submit                 -> submit code against all test cases
// GET  /api/code/submissions/:problemId -> fetch submission history and analytics
// GET  /api/code/drafts                 -> fetch a saved editor draft
// PUT  /api/code/drafts                 -> save the current editor draft
export const CODE_EDITOR_API_ENDPOINTS = {
  run: '/api/code/run',
  submit: '/api/code/submit',
  submissions: (problemId: string) => `/api/code/submissions/${problemId}`,
  draft: '/api/code/drafts',
} as const;

export interface SubmissionStats {
  userStats: {
    attempts: number;
    acceptedCount: number;
    bestRuntime: number | null;
    avgRuntime: number | null;
    bestMemory: number | null;
    avgMemory: number | null;
    lowestMemory: number | null;
  };
  globalStats: {
    totalCount: number;
    acceptedCount: number;
    acceptanceRate: number;
  };
}

export interface SubmissionHistoryResponse extends SubmissionStats {
  submissions: Submission[];
}

const draftStorageKey = (problemId: string, language: SupportedLanguage) => {
  return `skill-lens:code-editor:draft:${problemId}:${language}`;
};

function mapBackendStatusToRunResult(
  status: string,
): 'Success' | 'Compile Error' | 'Runtime Error' | 'Wrong Answer' {
  switch (status) {
    case 'ACCEPTED':
      return 'Success';
    case 'FAILED':
      return 'Wrong Answer';
    case 'COMPILATION_ERROR':
      return 'Compile Error';
    case 'RUNTIME_ERROR':
    default:
      return 'Runtime Error';
  }
}

function mapBackendStatusToFrontend(
  status: string,
):
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Runtime Error'
  | 'Compile Error'
  | 'Pending' {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'FAILED':
      return 'Wrong Answer';
    case 'TIMEOUT':
      return 'Time Limit Exceeded';
    case 'COMPILATION_ERROR':
      return 'Compile Error';
    case 'RUNTIME_ERROR':
    default:
      return 'Runtime Error';
  }
}

export const submissionService = {
  runCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<ExecutionResult> => {
    void problemId;
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        sourceCode: code,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to run code');
    }
    const data = await res.json();
    return {
      status: mapBackendStatusToRunResult(data.status),
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      runtime: data.executionTime || 0,
      memory: data.memoryUsed ? Math.round(data.memoryUsed / 1024 / 1024) : 0,
    };
  },

  submitCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<Submission> => {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        sourceCode: code,
        questionId: problemId,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to submit code');
    }
    const data = await res.json();
    return {
      id: data.submissionId,
      problemId,
      language,
      code,
      status: mapBackendStatusToFrontend(data.status),
      submittedAt: new Date().toISOString(),
      runtime: data.executionTime || 0,
      memory: data.memoryUsed ? Math.round(data.memoryUsed / 1024 / 1024) : 0,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      passedCount: data.passedCount || 0,
      totalCount: data.totalCount || 0,
      failedCases: data.failedCases
        ? data.failedCases.map((fc: any) => ({
            testCaseId: String(fc.index),
            input: fc.input || '',
            expectedOutput: fc.expectedOutput || '',
            actualOutput: fc.actualOutput || '',
            status: 'Failed',
            errorMessage: fc.message,
          }))
        : [],
    };
  },

  getSubmissions: async (problemId?: string): Promise<SubmissionHistoryResponse> => {
    void problemId;
    return {
      submissions: [],
      userStats: {
        attempts: 0,
        acceptedCount: 0,
        bestRuntime: null,
        avgRuntime: null,
        bestMemory: null,
        avgMemory: null,
        lowestMemory: null,
      },
      globalStats: {
        totalCount: 0,
        acceptedCount: 0,
        acceptanceRate: 0,
      },
    };
  },

  getDraft: async (problemId: string, language: SupportedLanguage): Promise<string | null> => {
    return window.localStorage.getItem(draftStorageKey(problemId, language));
  },

  saveDraft: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<void> => {
    window.localStorage.setItem(draftStorageKey(problemId, language), code);
  },
};
