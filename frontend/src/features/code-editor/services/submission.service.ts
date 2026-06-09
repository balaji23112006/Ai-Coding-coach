import type { ExecutionResult, Submission, SupportedLanguage } from '../types/editor.types';

export const submissionService = {
  runCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string
  ): Promise<ExecutionResult> => {
    // Simulate API delay
    console.log(`[SubmissionService] Running code for problem: ${problemId}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic heuristic to mock Compile Error if code has syntax mismatch
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces && (language === 'javascript' || language === 'typescript' || language === 'cpp' || language === 'java')) {
      return {
        status: 'Compile Error',
        stderr: `Line 12: SyntaxError: Unexpected end of input (curly braces mismatch: open ${openBraces}, close ${closeBraces})`,
        runtime: 0,
        memory: 0,
      };
    }

    if (code.includes('throw new Error') || code.includes('raise Exception')) {
      return {
        status: 'Runtime Error',
        stderr: 'RuntimeError: Division by zero or custom user exception thrown at runCode',
        runtime: 12,
        memory: 14.2,
      };
    }

    // Default mock success
    return {
      status: 'Success',
      stdout: 'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExpected: [0,1]\n\nAll basic test cases passed!',
      runtime: Math.floor(Math.random() * 40) + 15,
      memory: parseFloat((Math.random() * 10 + 20).toFixed(2)),
      passedCount: 3,
      totalCount: 3,
    };
  },

  submitCode: async (
    problemId: string,
    language: SupportedLanguage,
    code: string
  ): Promise<Submission> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    
    let status: Submission['status'] = 'Accepted';
    
    if (openBraces !== closeBraces && (language === 'javascript' || language === 'typescript' || language === 'cpp' || language === 'java')) {
      status = 'Runtime Error';
    } else if (code.includes('console.log') || code.includes('print')) {
      // Small chance of Wrong Answer to make it realistic and interactive
      status = Math.random() > 0.8 ? 'Wrong Answer' : 'Accepted';
    } else if (code.length < 50) {
      status = 'Wrong Answer';
    }

    return {
      id: Math.random().toString(36).substring(7),
      problemId,
      language,
      code,
      status,
      submittedAt: new Date().toISOString(),
      runtime: status === 'Accepted' ? Math.floor(Math.random() * 60) + 25 : undefined,
      memory: status === 'Accepted' ? parseFloat((Math.random() * 15 + 30).toFixed(2)) : undefined,
    };
  },
};
