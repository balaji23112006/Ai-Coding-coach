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

function isNumeric(val) {
  return typeof val === 'number' && !isNaN(val);
}

function approxEqual(a, b, tolerance = 1e-6) {
  if (isNumeric(a) && isNumeric(b)) {
    return Math.abs(a - b) <= tolerance;
  }
  return false;
}

function normalizeVal(val) {
  if (typeof val === 'string') {
    return val.replace(/\\r\\n/g, '\\n').trim().replace(/[ \\t]+/g, ' ');
  }
  if (Array.isArray(val)) {
    return val.map(normalizeVal);
  }
  if (val && typeof val === 'object') {
    const res = {};
    for (const k of Object.keys(val)) {
      res[k] = normalizeVal(val[k]);
    }
    return res;
  }
  return val;
}

function compareOutputs(actual, expected) {
  if (isNumeric(actual) && isNumeric(expected)) {
    return approxEqual(actual, expected);
  }
  const normActual = normalizeVal(actual);
  const normExpected = normalizeVal(expected);
  
  if (isNumeric(normActual) && isNumeric(normExpected)) {
    return approxEqual(Number(normActual), Number(normExpected));
  }

  // Recursive deep comparison with tolerance
  const isObjA = normActual && typeof normActual === 'object';
  const isObjB = normExpected && typeof normExpected === 'object';
  if (isObjA && isObjB) {
    const keysA = Object.keys(normActual);
    const keysB = Object.keys(normExpected);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!compareOutputs(normActual[key], normExpected[key])) return false;
    }
    return true;
  }
  
  return JSON.stringify(normActual) === JSON.stringify(normExpected);
}

let passed = 0;
let details = [];
for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  try {
    const result = ${functionName}(...tc.input);
    if (compareOutputs(result, tc.expected)) {
      passed++;
    } else {
      details.push(\`Test case \${i} failed. Expected \${JSON.stringify(tc.expected)}, got \${JSON.stringify(result)}\`);
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

def is_numeric(val):
    return isinstance(val, (int, float))

def approx_equal(a, b, tolerance=1e-6):
    if is_numeric(a) and is_numeric(b):
        return abs(a - b) <= tolerance
    return False

def normalize_val(val):
    if isinstance(val, str):
        return " ".join(val.replace("\\r\\n", "\\n").strip().split())
    if isinstance(val, list):
        return [normalize_val(x) for x in val]
    if isinstance(val, dict):
        return {k: normalize_val(v) for k, v in val.items()}
    return val

def compare_outputs(actual, expected):
    if is_numeric(actual) and is_numeric(expected):
        return approx_equal(actual, expected)
    norm_actual = normalize_val(actual)
    norm_expected = normalize_val(expected)
    
    try:
        if isinstance(norm_actual, str) and isinstance(norm_expected, str):
            return approx_equal(float(norm_actual), float(norm_expected))
    except ValueError:
        pass

    if isinstance(norm_actual, list) and isinstance(norm_expected, list):
        if len(norm_actual) != len(norm_expected):
            return False
        return all(compare_outputs(a, b) for a, b in zip(norm_actual, norm_expected))

    if isinstance(norm_actual, dict) and isinstance(norm_expected, dict):
        if len(norm_actual) != len(norm_expected):
            return False
        for k in norm_actual:
            if k not in norm_expected:
                return False
            if not compare_outputs(norm_actual[k], norm_expected[k]):
                return False
        return True

    return json.dumps(norm_actual, sort_keys=True) == json.dumps(norm_expected, sort_keys=True)

passed = 0
details = []
for i, tc in enumerate(test_cases):
    try:
        result = ${functionName}(*tc["input"])
        if compare_outputs(result, tc["expected"]):
            passed += 1
        else:
            details.append(f"Test case {i} failed. Expected {json.dumps(tc['expected'])}, got {json.dumps(result)}")
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

  async getSubmissionHistory(questionId: string, userId: string) {
    if (!userId) {
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
    }

    const submissions = await prisma.submission.findMany({
      where: {
        questionId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const userSubmissions = submissions;
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

    const uniqueAttemptedUsers = new Set<string>();
    const uniqueSolvedUsers = new Set<string>();

    allSubmissions.forEach(sub => {
      const uId = sub.userId || `anon_${sub.id}`;
      uniqueAttemptedUsers.add(uId);
      if (sub.status === 'ACCEPTED') {
        uniqueSolvedUsers.add(uId);
      }
    });

    const attemptedCount = uniqueAttemptedUsers.size;
    const solvedCount = uniqueSolvedUsers.size;

    const acceptanceRate = attemptedCount > 0
      ? Math.round((solvedCount / attemptedCount) * 100)
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
        acceptedCount: allSubmissions.filter(s => s.status === 'ACCEPTED').length,
        acceptanceRate,
      },
    };
  }
}

export const submissionService = new SubmissionService();

