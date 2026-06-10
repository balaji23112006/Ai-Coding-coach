import type { ExecutionResult, Submission, SupportedLanguage } from '../types/editor.types';
import { apiClient } from '../../../services/api-client';

export const submissionService = {
  runCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<ExecutionResult> => {
    console.log(`[SubmissionService] Executing code via API for problem: ${problemId}`);

    const apiResult = await apiClient.post<{
      success: boolean;
      status: string;
      stdout: string;
      stderr: string;
      executionTime: number;
      memoryUsed: number;
      outputTruncated: boolean;
    }>('/run', {
      language,
      sourceCode: code,
    });

    let status: ExecutionResult['status'] = 'Success';
    if (apiResult.status === 'COMPILATION_ERROR') {
      status = 'Compile Error';
    } else if (apiResult.status === 'RUNTIME_ERROR' || apiResult.status === 'FAILED') {
      status = 'Runtime Error';
    } else if (apiResult.status === 'TIMEOUT') {
      status = 'Runtime Error';
    }

    const memoryMB = parseFloat((apiResult.memoryUsed / (1024 * 1024)).toFixed(2));

    return {
      status,
      stdout: apiResult.stdout,
      stderr: apiResult.stderr,
      runtime: apiResult.executionTime,
      memory: memoryMB,
      passedCount: apiResult.status === 'ACCEPTED' ? 3 : 0,
      totalCount: 3,
    };
  },

  submitCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string,
  ): Promise<Submission> => {
    console.log(`[SubmissionService] Submitting code via API for problem: ${problemId}`);

    const apiResult = await apiClient.post<{
      submissionId: string;
      status: string;
      executionTime: number;
      memoryUsed: number;
    }>('/submit', {
      language,
      sourceCode: code,
    });

    let status: Submission['status'] = 'Accepted';
    if (apiResult.status === 'ACCEPTED') {
      status = 'Accepted';
    } else if (apiResult.status === 'TIMEOUT') {
      status = 'Time Limit Exceeded';
    } else {
      status = 'Runtime Error';
    }

    const memoryMB = parseFloat((apiResult.memoryUsed / (1024 * 1024)).toFixed(2));

    return {
      id: apiResult.submissionId,
      problemId,
      language,
      code,
      status,
      submittedAt: new Date().toISOString(),
      runtime: apiResult.executionTime,
      memory: memoryMB,
    };
  },
};
