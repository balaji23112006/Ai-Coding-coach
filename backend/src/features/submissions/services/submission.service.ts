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

export class SubmissionService {
  async runCode(input: RunCodeInput): Promise<CodeExecutionResult> {
    return codeExecutionService.execute({
      language: input.language,
      sourceCode: input.sourceCode,
    });
  }

  async submitCode(input: SubmitCodeInput) {
    let finalCode = input.sourceCode;
    let hasTestCases = false;
    let questionObj: any = null;

    if (input.questionId) {
      questionObj = await prisma.question.findUnique({
        where: { id: input.questionId },
        include: { testCases: true },
      });
      if (questionObj && questionObj.testCases.length > 0) {
        hasTestCases = true;
      }
    }

    if (hasTestCases && questionObj) {
      let functionName = '';
      if (input.language === 'javascript') {
        const match = input.sourceCode.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
        if (match) functionName = match[1];
      } else if (input.language === 'python') {
        const match = input.sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (match) functionName = match[1];
      }

      if (functionName) {
        if (input.language === 'javascript') {
          const jsDriver = `
// --- TEST RUNNER DRIVER ---
const testCases = [
  ${questionObj.testCases.map((tc: any) => `{
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
          finalCode = input.sourceCode + '\n' + jsDriver;
        } else if (input.language === 'python') {
          const pyDriver = `
# --- TEST RUNNER DRIVER ---
import json

test_cases = [
  ${questionObj.testCases.map((tc: any) => `{
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
          finalCode = input.sourceCode + '\n' + pyDriver;
        }
      }
    }

    const result = await codeExecutionService.execute({
      language: input.language,
      sourceCode: finalCode,
    });

    let submissionStatus = result.status;
    if (hasTestCases && submissionStatus === 'ACCEPTED') {
      if (!result.stdout || !result.stdout.includes('ALL_TESTS_PASSED')) {
        submissionStatus = 'FAILED';
      }
    }

    const createData: any = {
      language: mapStringToLanguage(input.language),
      status: submissionStatus,
      sourceCode: input.sourceCode, // save original clean user code
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

    if (input.questionId && questionObj) {
      createData.question = { connect: { id: input.questionId } };
    }

    const submission = await submissionRepository.create(createData);

    return {
      submissionId: submission.id,
      status: submission.status,
      executionTime: submission.executionTime,
      memoryUsed: submission.memoryUsed,
    };
  }

  async getSubmission(id: string): Promise<Submission> {
    const submission = await submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundError(`Submission with ID ${id} not found`);
    }
    return submission;
  }
}

export const submissionService = new SubmissionService();

