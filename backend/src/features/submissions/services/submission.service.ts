import { Submission } from '@prisma/client';
import { submissionRepository } from '../repository/submission.repository.js';
import { codeExecutionService } from '../../../execution/services/CodeExecutionService.js';
import { RunCodeInput, SubmitCodeInput } from '../schemas/submission.schema.js';
import {
  mapStringToLanguage,
  CodeExecutionResult,
} from '../../../execution/types/execution.types.js';
import { NotFoundError } from '../../../shared/errors/custom.errors.js';
import { prisma } from '../../../database/prisma.js';
import { logger } from '../../../shared/utils/logger.js';

type QuestionWithTestCases = {
  id: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
};

type TestExecution = {
  result: CodeExecutionResult;
  question: QuestionWithTestCases | null;
  hasTestCases: boolean;
};

export class SubmissionService {
  async runCode(input: RunCodeInput): Promise<CodeExecutionResult> {
    const execution = await this.executeWithQuestionTests(input, false);
    return execution.result;
  }

  async submitCode(input: SubmitCodeInput) {
    const execution = await this.executeWithQuestionTests(input, true);
    const { result, question, hasTestCases } = execution;

    const createData: any = {
      language: mapStringToLanguage(input.language),
      status: result.status,
      sourceCode: input.sourceCode,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      outputTruncated: result.outputTruncated,
    };

    if (input.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: input.userId },
      });
      if (userExists) {
        createData.user = { connect: { id: input.userId } };
      } else {
        logger.warn(
          `UserId "${input.userId}" not found in database. Storing submission anonymously.`,
        );
      }
    }

    if (input.questionId && question) {
      createData.question = { connect: { id: input.questionId } };
    }

    if (input.questionId && !question) {
      logger.warn(`QuestionId "${input.questionId}" not found. Saving submission without question relation.`);
    }

    const submission = await submissionRepository.create(createData);

    return {
      submissionId: submission.id,
      status: submission.status,
      executionTime: submission.executionTime,
      memoryUsed: submission.memoryUsed,
      stdout: submission.stdout,
      stderr: submission.stderr,
      hasTestCases,
    };
  }

  private async executeWithQuestionTests(
    input: Pick<SubmitCodeInput, 'language' | 'sourceCode' | 'questionId'>,
    includeHiddenTests: boolean,
  ): Promise<TestExecution> {
    const question = await this.findQuestionWithTests(input.questionId);
    const testCases = question?.testCases.filter(tc => includeHiddenTests || !tc.isHidden) ?? [];
    const hasTestCases = testCases.length > 0;
    const finalCode = hasTestCases
      ? this.buildCodeWithTestDriver(input.language, input.sourceCode, testCases)
      : input.sourceCode;

    const result = await codeExecutionService.execute({
      language: input.language,
      sourceCode: finalCode,
    });

    if (hasTestCases && result.status === 'ACCEPTED' && !result.stdout.includes('ALL_TESTS_PASSED')) {
      result.status = 'FAILED';
      result.success = false;
    }

    return { result, question, hasTestCases };
  }

  private async findQuestionWithTests(questionId?: string | null): Promise<QuestionWithTestCases | null> {
    if (!questionId) return null;

    return prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        testCases: {
          select: {
            input: true,
            expectedOutput: true,
            isHidden: true,
          },
        },
      },
    });
  }

  private buildCodeWithTestDriver(
    language: string,
    sourceCode: string,
    testCases: QuestionWithTestCases['testCases'],
  ): string {
    const functionName = this.extractFunctionName(language, sourceCode);
    if (!functionName) return sourceCode;

    if (language === 'javascript' || language === 'typescript') {
      const jsDriver = `
// --- TEST RUNNER DRIVER ---
const testCases = [
  ${testCases.map(tc => `{
    input: [${tc.input}],
    expected: ${tc.expectedOutput}
  }`).join(',\n  ')}
];
let passed = 0;
let details = [];
for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  try {
    const result = ${functionName}(...tc.input);
    const resultJson = JSON.stringify(result);
    const expectedJson = JSON.stringify(tc.expected);
    if (resultJson === expectedJson) {
      passed++;
    } else {
      details.push(\`Test case \${i} failed. Expected \${expectedJson}, got \${resultJson}\`);
    }
  } catch (e) {
    details.push(\`Test case \${i} threw error: \${e.message}\`);
  }
}
console.log("\\n--- TEST RESULTS ---");
console.log(\`PASSED: \${passed}\`);
console.log(\`TOTAL: \${testCases.length}\`);
if (passed === testCases.length) {
  console.log("ALL_TESTS_PASSED");
} else {
  details.forEach(d => console.log(d));
}
`;
      return sourceCode + '\n' + jsDriver;
    }

    if (language === 'python') {
      const pyDriver = `
# --- TEST RUNNER DRIVER ---
import json

test_cases = [
  ${testCases.map(tc => `{
    "input": [${tc.input}],
    "expected": ${tc.expectedOutput}
  }`).join(',\n  ')}
]
passed = 0
details = []
for i, tc in enumerate(test_cases):
    try:
        result = ${functionName}(*tc["input"])
        result_json = json.dumps(result, separators=(',', ':'))
        expected_json = json.dumps(tc["expected"], separators=(',', ':'))
        if result_json == expected_json:
            passed += 1
        else:
            details.append(f"Test case {i} failed. Expected {expected_json}, got {result_json}")
    except Exception as e:
        details.append(f"Test case {i} threw error: {str(e)}")

print("\\n--- TEST RESULTS ---")
print(f"PASSED: {passed}")
print(f"TOTAL: {len(test_cases)}")
if passed == len(test_cases):
    print("ALL_TESTS_PASSED")
else:
    for d in details:
        print(d)
`;
      return sourceCode + '\n' + pyDriver;
    }

    return sourceCode;
  }

  private extractFunctionName(language: string, sourceCode: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return sourceCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ?? '';
    }
    if (language === 'python') {
      return sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ?? '';
    }
    return '';
  }

  async getSubmission(id: string): Promise<Submission> {
    const submission = await submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundError(`Submission with ID ${id} not found`);
    }
    return submission;
  }

  async getSubmissionHistory(questionId: string, userId?: string) {
    const submissions = await prisma.submission.findMany({
      where: {
        questionId,
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const userSubmissions = userId
      ? submissions.filter(s => s.userId === userId)
      : [];
    const allSubmissions = await prisma.submission.findMany({
      where: { questionId },
    });

    const acceptedCount = userSubmissions.filter(s => s.status === 'ACCEPTED').length;
    const totalAttempts = userSubmissions.length;
    const avgRuntime = userSubmissions.length > 0
      ? Math.round(userSubmissions.reduce((sum, s) => sum + s.executionTime, 0) / userSubmissions.length)
      : null;
    const bestRuntime = userSubmissions.length > 0
      ? Math.min(...userSubmissions.map(s => s.executionTime))
      : null;
    const avgMemory = userSubmissions.length > 0
      ? Math.round(userSubmissions.reduce((sum, s) => sum + s.memoryUsed, 0) / userSubmissions.length)
      : null;
    const bestMemory = userSubmissions.length > 0
      ? Math.min(...userSubmissions.map(s => s.memoryUsed))
      : null;

    const allAccepted = allSubmissions.filter(s => s.status === 'ACCEPTED').length;
    const acceptanceRate = allSubmissions.length > 0
      ? Math.round((allAccepted / allSubmissions.length) * 100)
      : 0;

    return {
      submissions: submissions.slice(0, 10),
      userStats: {
        attempts: totalAttempts,
        acceptedCount,
        bestRuntime,
        avgRuntime,
        bestMemory,
        avgMemory,
        lowestMemory: bestMemory,
      },
      globalStats: {
        totalCount: allSubmissions.length,
        acceptedCount: allAccepted,
        acceptanceRate,
      },
    };
  }
}

export const submissionService = new SubmissionService();

