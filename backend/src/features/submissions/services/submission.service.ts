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
import { profileGraph } from '../../../ai/profile-agent/profileGraph.js';
import { agentLogger } from '../../../ai/profile-agent/services/AgentLogger.js';
import { profileSummaryService } from '../../../ai/profile-agent/services/ProfileSummaryService.js';
import { langfuse } from '../../../providers/langfuse/index.js';

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
  async runCode(input: RunCodeInput) {
    const execution = await this.executeWithQuestionTests(input, false);
    const { result, question, hasTestCases } = execution;

    let passedCount = 0;
    let totalCount = 0;
    const failedCases: Array<{
      index: number;
      message: string;
      input?: string;
      expectedOutput?: string;
      actualOutput?: string;
    }> = [];

    if (hasTestCases && result.stdout) {
      const passedMatch = result.stdout.match(/PASSED:\s*(\d+)/);
      const totalMatch = result.stdout.match(/TOTAL:\s*(\d+)/);
      if (passedMatch) passedCount = parseInt(passedMatch[1], 10);
      if (totalMatch) totalCount = parseInt(totalMatch[1], 10);

      const failureLines = result.stdout
        .split('\n')
        .filter(
          (line: string) =>
            line.startsWith('Test case ') &&
            (line.includes('failed') || line.includes('threw error')),
        );
      for (const line of failureLines) {
        const idxMatch = line.match(/Test case (\d+)/);
        const index = idxMatch ? parseInt(idxMatch[1], 10) : -1;
        const tc = index >= 0 && question ? question.testCases[index] : null;
        const gotMatch = line.match(/got (.*)$/);
        const actualOutput = gotMatch ? gotMatch[1] : '';

        failedCases.push({
          index,
          message: line,
          input: tc ? tc.input : '',
          expectedOutput: tc ? tc.expectedOutput : '',
          actualOutput: actualOutput,
        });
      }
    }

    return {
      status: result.status,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      stdout: result.stdout,
      stderr: result.stderr,
      passedCount,
      totalCount,
      failedCases,
    };
  }

  async submitCode(input: SubmitCodeInput) {
    let finalCode = input.sourceCode;
    let hasTestCases = false;
    let questionObj: any = null;

    if (input.questionId) {
      questionObj = await prisma.question.findUnique({
        where: { id: input.questionId },
        include: {
          testCases: true,
          topics: {
            include: { topic: true },
          },
        },
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

      const isTreeQuestion =
        questionObj.topics?.some((t: any) => t.topic.name === 'Trees') || false;

      if (functionName) {
        if (input.language === 'javascript') {
          const jsDriver = `
// --- TEST RUNNER DRIVER ---
${
  isTreeQuestion
    ? `
class TreeNode {
  constructor(val, left, right) {
    this.val = (val===undefined ? 0 : val);
    this.left = (left===undefined ? null : left);
    this.right = (right===undefined ? null : right);
  }
}

function deserializeTree(arr) {
  if (!arr || arr.length === 0) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (curr) {
      if (arr[i] !== null && arr[i] !== undefined) {
        curr.left = new TreeNode(arr[i]);
        queue.push(curr.left);
      }
      i++;
      if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
        curr.right = new TreeNode(arr[i]);
        queue.push(curr.right);
      }
      i++;
    }
  }
  return root;
}

function findNodesByVal(root, val, results = []) {
  if (!root) return results;
  if (root.val === val) results.push(root);
  findNodesByVal(root.left, val, results);
  findNodesByVal(root.right, val, results);
  return results;
}

function getLCA(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left = getLCA(root.left, p, q);
  const right = getLCA(root.right, p, q);
  if (left && right) return root;
  return left ? left : right;
}
`
    : ''
}

const testCases = [
  ${questionObj.testCases
    .map(
      (tc: any) => `{
    input: [${tc.input}],
    expected: ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
];
let passed = 0;
let details = [];
for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  try {
    let args = ${isTreeQuestion ? 'tc.input.map(arg => Array.isArray(arg) ? deserializeTree(arg) : arg)' : 'tc.input'};
    if (${questionObj.slug === 'lowest-common-ancestor-of-a-binary-tree'}) {
      const tree = args[0];
      const pCandidates = findNodesByVal(tree, tc.input[1]);
      const qCandidates = findNodesByVal(tree, tc.input[2]);
      let pNode = pCandidates[0] || null;
      let qNode = qCandidates[0] || null;
      let found = false;
      for (let pCand of pCandidates) {
        for (let qCand of qCandidates) {
          const lca = getLCA(tree, pCand, qCand);
          if (lca && lca.val === Number(tc.expected)) {
            pNode = pCand;
            qNode = qCand;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      args = [tree, pNode, qNode];
    }
    const result = ${functionName}(...args);
    let finalResult = result;
    if (result && typeof result === 'object' && 'val' in result) {
      finalResult = result.val;
    }
    const resultJson = JSON.stringify(finalResult);
    const expectedJson = JSON.stringify(tc.expected);
    if (resultJson === expectedJson) {
      passed++;
    } else {
      const eStr = expectedJson.length > 200 ? expectedJson.substring(0, 200) + '...[truncated]' : expectedJson;
      const rStr = resultJson.length > 200 ? resultJson.substring(0, 200) + '...[truncated]' : resultJson;
      details.push(\`Test case \${i} failed. Expected \${eStr}, got \${rStr}\`);
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
null = None
false = False
true = True

${
  isTreeQuestion
    ? `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def deserializeTree(arr):
    if not arr or len(arr) == 0:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        curr = queue.pop(0)
        if curr:
            if i < len(arr) and arr[i] is not None:
                curr.left = TreeNode(arr[i])
                queue.append(curr.left)
            i += 1
            if i < len(arr) and arr[i] is not None:
                curr.right = TreeNode(arr[i])
                queue.append(curr.right)
            i += 1
    return root

def findNodesByVal(root, val):
    if not root:
        return []
    res = []
    if root.val == val:
        res.append(root)
    res.extend(findNodesByVal(root.left, val))
    res.extend(findNodesByVal(root.right, val))
    return res

def getLCA(root, p, q):
    if not root or root == p or root == q:
        return root
    left = getLCA(root.left, p, q)
    right = getLCA(root.right, p, q)
    if left and right:
        return root
    return left if left else right
`
    : ''
}

test_cases = [
  ${questionObj.testCases
    .map(
      (tc: any) => `{
    "input": [${tc.input}],
    "expected": ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
]
passed = 0
details = []
for i, tc in enumerate(test_cases):
    try:
        args = ${isTreeQuestion ? '[deserializeTree(arg) if isinstance(arg, list) else arg for arg in tc["input"]]' : 'tc["input"]'}
        if ${questionObj.slug === 'lowest-common-ancestor-of-a-binary-tree' ? 'True' : 'False'}:
            tree = args[0]
            p_val = tc["input"][1]
            q_val = tc["input"][2]
            expected_val = int(tc["expected"])
            
            p_candidates = findNodesByVal(tree, p_val)
            q_candidates = findNodesByVal(tree, q_val)
            
            p_node = p_candidates[0] if p_candidates else None
            q_node = q_candidates[0] if q_candidates else None
            
            found = False
            for p_cand in p_candidates:
                for q_cand in q_candidates:
                    lca_node = getLCA(tree, p_cand, q_cand)
                    if lca_node and lca_node.val == expected_val:
                        p_node = p_cand
                        q_node = q_cand
                        found = True
                        break
                if found:
                    break
            args = [tree, p_node, q_node]
        result = ${functionName}(*args)
        final_result = result
        if result and hasattr(result, 'val'):
            final_result = result.val
        result_json = json.dumps(final_result, separators=(',', ':'))
        expected_json = json.dumps(tc["expected"], separators=(',', ':'))
        if result_json == expected_json:
            passed += 1
        else:
            e_str = expected_json if len(expected_json) < 200 else expected_json[:200] + '...[truncated]'
            r_str = result_json if len(result_json) < 200 else result_json[:200] + '...[truncated]'
            details.append(f"Test case {i} failed. Expected {e_str}, got {r_str}")
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

    // Parse structured test results from stdout
    let passedCount = 0;
    let totalCount = 0;
    const failedCases: Array<{
      index: number;
      message: string;
      input?: string;
      expectedOutput?: string;
      actualOutput?: string;
    }> = [];

    if (hasTestCases && result.stdout) {
      const passedMatch = result.stdout.match(/PASSED:\s*(\d+)/);
      const totalMatch = result.stdout.match(/TOTAL:\s*(\d+)/);
      if (passedMatch) passedCount = parseInt(passedMatch[1], 10);
      if (totalMatch) totalCount = parseInt(totalMatch[1], 10);

      // Extract individual failure messages
      const failureLines = result.stdout
        .split('\n')
        .filter(
          (line: string) =>
            line.startsWith('Test case ') &&
            (line.includes('failed') || line.includes('threw error')),
        );
      for (const line of failureLines) {
        const idxMatch = line.match(/Test case (\d+)/);
        const index = idxMatch ? parseInt(idxMatch[1], 10) : -1;
        const tc = index >= 0 && questionObj ? questionObj.testCases[index] : null;
        const gotMatch = line.match(/got (.*)$/);
        const actualOutput = gotMatch ? gotMatch[1] : '';

        failedCases.push({
          index,
          message: line,
          input: tc ? tc.input : '',
          expectedOutput: tc ? tc.expectedOutput : '',
          actualOutput: actualOutput,
        });
      }
    }

    const createData: any = {
      language: mapStringToLanguage(input.language),
      status: submissionStatus,
      sourceCode: input.sourceCode,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      outputTruncated: result.outputTruncated,
      testsPassed: passedCount,
      testsTotal: totalCount,
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

    if (input.userId) {
      const userId = input.userId;
      const traceId = `trace-submission-${userId}-${Date.now()}`;
      agentLogger.startRun(userId, 'submission', traceId);
      agentLogger.logRequest(traceId, { userId, submissionId: submission.id });

      // Run the profile agent assessment graph in the background with a 30s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort('Timeout exceeded for background profile assessment'), 30000);

      profileGraph
        .invoke({ userId, traceId }, { signal: controller.signal })
        .then(async (finalState) => {
          clearTimeout(timeout);
          let _summary = '';
          let _trendExplanation = '';
          if (finalState.profileStatus !== 'BOOTSTRAP') {
            try {
              _summary = await profileSummaryService.generateProfileSummary({
                level: finalState.level,
                mastery: finalState.mastery,
                strongAreas: finalState.strongAreas,
                weakAreas: finalState.weakAreas,
                traceId,
              });
              _trendExplanation = await profileSummaryService.generateTrendExplanation({
                trends: finalState.trends,
                recentActivityCount: finalState.recentActivity.length,
                traceId,
              });
            } catch (err) {
              console.error(
                '[Submission Service] Error generating AI summary content during background run:',
                err,
              );
            }
          }
          agentLogger.logResponse(traceId, {
            success: true,
            userId: finalState.userId,
            level: finalState.level,
            easySolved: finalState.easySolved,
            mediumSolved: finalState.mediumSolved,
            hardSolved: finalState.hardSolved,
            solvedCount: finalState.solvedCount,
          });
          await agentLogger.finalizeRun(traceId, 'completed');
          langfuse.flushAsync().catch(console.error);
        })
        .catch(async (error) => {
          clearTimeout(timeout);
          console.error('[Submission Service] Background profile assessment error:', error);
          await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));
          langfuse.flushAsync().catch(console.error);
        });
    }

    return {
      submissionId: submission.id,
      status: submission.status,
      executionTime: submission.executionTime,
      memoryUsed: submission.memoryUsed,
      stdout: submission.stdout,
      stderr: submission.stderr,
      passedCount,
      totalCount,
      failedCases,
    };
  }

  private async executeWithQuestionTests(
    input: Pick<SubmitCodeInput, 'language' | 'sourceCode' | 'questionId'>,
    includeHiddenTests: boolean,
  ): Promise<TestExecution> {
    const question = await this.findQuestionWithTests(input.questionId);
    const testCases = question?.testCases.filter((tc) => includeHiddenTests || !tc.isHidden) ?? [];
    const hasTestCases = testCases.length > 0;
    const finalCode = hasTestCases
      ? this.buildCodeWithTestDriver(input.language, input.sourceCode, testCases)
      : input.sourceCode;

    const result = await codeExecutionService.execute({
      language: input.language,
      sourceCode: finalCode,
    });

    if (
      hasTestCases &&
      result.status === 'ACCEPTED' &&
      !result.stdout.includes('ALL_TESTS_PASSED')
    ) {
      result.status = 'FAILED';
      result.success = false;
    }

    return { result, question, hasTestCases };
  }

  private async findQuestionWithTests(
    questionId?: string | null,
  ): Promise<QuestionWithTestCases | null> {
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
  ${testCases
    .map(
      (tc) => `{
    input: [${tc.input}],
    expected: ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
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
  ${testCases
    .map(
      (tc) => `{
    "input": [${tc.input}],
    "expected": ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
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
            e_json = json.dumps(tc['expected'])
            r_json = json.dumps(result)
            e_str = e_json if len(e_json) < 200 else e_json[:200] + '...[truncated]'
            r_str = r_json if len(r_json) < 200 else r_json[:200] + '...[truncated]'
            details.append(f"Test case {i} failed. Expected {e_str}, got {r_str}")
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

    const acceptedCount = userSubmissions.filter((s) => s.status === 'ACCEPTED').length;
    const totalAttempts = userSubmissions.length;
    const avgRuntime =
      userSubmissions.length > 0
        ? Math.round(
            userSubmissions.reduce((sum, s) => sum + s.executionTime, 0) / userSubmissions.length,
          )
        : null;
    const bestRuntime =
      userSubmissions.length > 0 ? Math.min(...userSubmissions.map((s) => s.executionTime)) : null;
    const avgMemory =
      userSubmissions.length > 0
        ? Math.round(
            userSubmissions.reduce((sum, s) => sum + s.memoryUsed, 0) / userSubmissions.length,
          )
        : null;
    const bestMemory =
      userSubmissions.length > 0 ? Math.min(...userSubmissions.map((s) => s.memoryUsed)) : null;

    const uniqueAttemptedUsers = new Set<string>();
    const uniqueSolvedUsers = new Set<string>();

    allSubmissions.forEach((sub) => {
      const uId = sub.userId || `anon_${sub.id}`;
      uniqueAttemptedUsers.add(uId);
      if (sub.status === 'ACCEPTED') {
        uniqueSolvedUsers.add(uId);
      }
    });

    const attemptedCount = uniqueAttemptedUsers.size;
    const solvedCount = uniqueSolvedUsers.size;

    const acceptanceRate =
      attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0;

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
        acceptedCount: allSubmissions.filter((s) => s.status === 'ACCEPTED').length,
        acceptanceRate,
      },
    };
  }
}

export const submissionService = new SubmissionService();
