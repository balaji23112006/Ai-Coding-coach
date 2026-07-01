import { broadcastWS } from '../../../utils/websocket.js';
import { AgentState } from './state.js';
import {
  executeCode,
  runTests,
  detectErrors,
  analyzeComplexity,
  reviewCode,
  saveEvalResult,
} from './tools.js';

/**
 * Tracing wrapper for nodes
 */
async function executeTracedNode(
  nodeName: string,
  state: AgentState,
  nodeFn: (state: AgentState) => Promise<Partial<AgentState>> | Partial<AgentState>,
): Promise<AgentState> {
  console.log(`🔧 [Node: ${nodeName}] Starting execution...`);
  const startTime = Date.now();

  try {
    const result = await nodeFn(state);
    const duration = Date.now() - startTime;
    console.log(`🔧 [Node: ${nodeName}] Done in ${duration}ms`);

    broadcastWS({
      event: 'node_complete',
      node: nodeName,
      status: 'done',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });

    return {
      ...state,
      ...result,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`🔧 [Node: ${nodeName}] Error in ${duration}ms:`, errorMsg);

    broadcastWS({
      event: 'node_complete',
      node: nodeName,
      status: 'error',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });

    return {
      ...state,
      error: errorMsg,
    };
  }
}

/**
 * Node 1: Execute Code
 */
export async function executeCodeNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('executeCode', state, async (s) => {
    const res = await executeCode(s.submittedCode, s.language);
    return { execResult: res };
  });
}

/**
 * Node 2: Run Test Cases
 */
export async function runTestsNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('runTests', state, async (s) => {
    const res = await runTests(s.problemId, s.submittedCode, s.testCases, s.language);
    return { testResults: res };
  });
}

/**
 * Router after Node 2: decideAfterTests
 */
export function decideAfterTests(state: AgentState): 'detectBugs' | 'analyzeComplexity' {
  if (state.testResults?.allPassed) {
    console.log('🔧 [Decision] All tests passed. Skipping detectBugs.');
    broadcastWS({
      event: 'node_complete',
      node: 'detectBugs',
      status: 'skipped',
      duration_ms: 0,
      timestamp: new Date().toISOString(),
    });
    return 'analyzeComplexity';
  } else {
    console.log('🔧 [Decision] Some tests failed. Routing to detectBugs.');
    return 'detectBugs';
  }
}

/**
 * Node 3a: Detect Bugs
 */
export async function detectBugsNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('detectBugs', state, async (s) => {
    const stderr = s.execResult?.stderr || '';
    const failedTests = s.testResults?.results.filter((r) => !r.passed) || [];
    const report = detectErrors(s.submittedCode, stderr, failedTests);
    return { bugReport: report };
  });
}

/**
 * Node 3: Analyze Complexity
 */
export async function analyzeComplexityNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('analyzeComplexity', state, async (s) => {
    const res = await analyzeComplexity(s.submittedCode, s.problemId);
    return { complexity: res };
  });
}

/**
 * Node 4: Review Code Quality
 */
export async function reviewCodeQualityNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('reviewCode', state, async (s) => {
    const res = reviewCode(s.submittedCode);
    return { qualityReview: res };
  });
}

/**
 * Node 5: Compute Evaluation Score
 */
export async function computeEvaluationScoreNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('computeScore', state, (s) => {
    const correctness = s.testResults ? s.testResults.passRate : 0;
    const complexity = s.complexity ? (s.complexity.isOptimal ? 100 : 60) : 0;
    const quality = s.qualityReview ? s.qualityReview.qualityScore : 0;

    const evalScore = Math.round(correctness * 0.5 + complexity * 0.3 + quality * 0.2);

    return { evalScore };
  });
}

/**
 * Node 6: Classify Verdict
 */
export async function classifyVerdictNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('classifyVerdict', state, (s) => {
    const score = s.evalScore || 0;
    let verdict: AgentState['verdict'] = 'Fail';

    if (score >= 80) {
      verdict = 'Pass';
    } else if (score >= 50) {
      verdict = 'Partial Pass';
    }

    return { verdict };
  });
}

/**
 * Node 7: Generate Feedback
 */
export async function generateFeedbackNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('generateFeedback', state, (s) => {
    const feedbackList: string[] = [];

    // Correctness feedback
    if (s.testResults) {
      feedbackList.push(
        `✅ Correctness: Passed ${s.testResults.passed}/${s.testResults.total} test cases (${s.testResults.passRate.toFixed(1)}%).`,
      );
    }

    // Bugs feedback
    if (s.bugReport && s.bugReport.hasBugs) {
      feedbackList.push(
        `⚠️ Bugs: Found ${s.bugReport.bugCount} issue(s). ${s.bugReport.bugs.map((b) => `${b.message} (Line ${b.line || 'unknown'}): ${b.hint}`).join('; ')}`,
      );
    } else {
      feedbackList.push('🎉 Code runs smoothly without syntax or runtime exceptions.');
    }

    // Complexity feedback
    if (s.complexity) {
      feedbackList.push(
        `⚡ Complexity: Time ${s.complexity.timeComplexity} | Space ${s.complexity.spaceComplexity}. ${
          s.complexity.isOptimal
            ? 'Optimal performance achieved.'
            : s.complexity.suggestion || 'Improvements are possible.'
        }`,
      );
    }

    // Quality feedback
    if (s.qualityReview) {
      feedbackList.push(
        `✍️ Code Quality: Score ${s.qualityReview.qualityScore}/100 (Grade: ${
          s.qualityReview.grade
        }). ${
          s.qualityReview.issues.length > 0
            ? `Issues: ${s.qualityReview.issues.join(', ')}`
            : 'Excellent code structure and naming conventions.'
        }`,
      );
    }

    return { feedback: feedbackList };
  });
}

/**
 * Node 8: Save Evaluation Result
 */
export async function saveEvaluationResultNode(state: AgentState): Promise<AgentState> {
  return executeTracedNode('saveEvalResult', state, async (s) => {
    const savedRecord = await saveEvalResult(s);
    return {
      // We can attach the savedAt property from the saved Prisma record
      execResult: s.execResult,
    };
  });
}
