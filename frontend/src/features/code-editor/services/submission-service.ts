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
): 'Success' | 'Compile Error' | 'Runtime Error' | 'Wrong Answer' | 'Time Limit Exceeded' {
  switch (status) {
    case 'ACCEPTED':
      return 'Success';
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

function mapBackendStatusToFrontend(status: string): 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compile Error' | 'Pending' {
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

function parseTestCounts(stdout: string): Pick<Submission, 'passedCount' | 'totalCount'> {
  const passedMatch = stdout.match(/PASSED:\s*(\d+)/);
  const totalMatch = stdout.match(/TOTAL:\s*(\d+)/);

  return {
    passedCount: passedMatch ? parseInt(passedMatch[1], 10) : undefined,
    totalCount: totalMatch ? parseInt(totalMatch[1], 10) : undefined,
  };
}

export const submissionService = {
  runCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<ExecutionResult> => {
    const res = await fetch('/api/run', {
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
      throw new Error(errText || 'Failed to run code');
    }
    const data = await res.json();
    const stdout: string = data.stdout || '';
    return {
      status: mapBackendStatusToRunResult(data.status),
      stdout,
      stderr: data.stderr || '',
      runtime: data.executionTime || 0,
      memory: data.memoryUsed ? Math.round(data.memoryUsed / 1024 / 1024) : 0,
      ...parseTestCounts(stdout),
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
    const stdout: string = data.stdout || '';

    return {
      id: data.submissionId,
      problemId,
      language,
      code,
      status: mapBackendStatusToFrontend(data.status),
      submittedAt: new Date().toISOString(),
      stdout,
      runtime: data.executionTime || 0,
      memory: data.memoryUsed ? Math.round(data.memoryUsed / 1024 / 1024) : 0,
      ...parseTestCounts(stdout),
      stderr: data.stderr || undefined,
    };
  },

  getSubmissions: async (problemId?: string): Promise<SubmissionHistoryResponse> => {
    if (problemId) {
      try {
        const res = await fetch(`/api/submissions/${problemId}`);
        if (res.ok) {
          const data = await res.json();
          return {
            submissions: (data.submissions || []).map((submission: any) => ({
              id: submission.id,
              problemId: submission.questionId || problemId,
              language: String(submission.language || 'javascript').toLowerCase(),
              code: submission.sourceCode || '',
              status: mapBackendStatusToFrontend(submission.status),
              submittedAt: submission.createdAt || new Date().toISOString(),
              stdout: submission.stdout || '',
              stderr: submission.stderr || undefined,
              runtime: submission.executionTime || 0,
              memory: submission.memoryUsed ? Math.round(submission.memoryUsed / 1024 / 1024) : 0,
              ...parseTestCounts(submission.stdout || ''),
            })),
            userStats: data.userStats,
            globalStats: data.globalStats,
          };
        }
      } catch {
        // Fall through to the fast empty state when the backend endpoint is unavailable.
      }
    }

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

  getDraft: async (
    problemId: string,
    language: SupportedLanguage,
  ): Promise<string | null> => {
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
