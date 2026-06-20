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
        include: {
          testCases: true,
          topics: {
            include: { topic: true }
          }
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

      const isTreeQuestion = questionObj.topics?.some((t: any) => t.topic.name === 'Trees') || false;

      if (functionName) {
        if (input.language === 'javascript') {
          const jsDriver = `
// --- TEST RUNNER DRIVER ---
${isTreeQuestion ? `
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
` : ''}

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
null = None
false = False
true = True

${isTreeQuestion ? `
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
` : ''}

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
      const failureLines = result.stdout.split('\n').filter(
        (line: string) => line.startsWith('Test case ') && (line.includes('failed') || line.includes('threw error'))
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

    if (input.userId) {
      const userId = input.userId;
      const traceId = `trace-submission-${userId}-${Date.now()}`;
      agentLogger.startRun(userId, 'submission', traceId);
      agentLogger.logRequest(traceId, { userId, submissionId: submission.id });
      
      // Run the profile agent assessment graph in the background
      profileGraph.invoke({ userId, traceId })
        .then(async (finalState) => {
          let summary = '';
          let trendExplanation = '';
          if (finalState.profileStatus !== 'BOOTSTRAP') {
            try {
              summary = await profileSummaryService.generateProfileSummary({
                level: finalState.level,
                mastery: finalState.mastery,
                strongAreas: finalState.strongAreas,
                weakAreas: finalState.weakAreas,
                traceId,
              });
              trendExplanation = await profileSummaryService.generateTrendExplanation({
                trends: finalState.trends,
                recentActivityCount: finalState.recentActivity.length,
                traceId,
              });
            } catch (err) {
              console.error('[Submission Service] Error generating AI summary content during background run:', err);
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
          await langfuse.flushAsync();
        })
        .catch(async (error) => {
          console.error('[Submission Service] Background profile assessment error:', error);
          await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));
          await langfuse.flushAsync();
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

  async getSubmission(id: string): Promise<Submission> {
    const submission = await submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundError(`Submission with ID ${id} not found`);
    }
    return submission;
  }
}

export const submissionService = new SubmissionService();

