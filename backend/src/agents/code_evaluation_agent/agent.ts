import { StateGraph, START, END } from '@langchain/langgraph';
import { StateAnnotation, AgentState } from './state.js';
import {
  executeCodeNode,
  runTestsNode,
  decideAfterTests,
  detectBugsNode,
  analyzeComplexityNode,
  reviewCodeQualityNode,
  computeEvaluationScoreNode,
  classifyVerdictNode,
  generateFeedbackNode,
  saveEvaluationResultNode,
} from './nodes.js';

// Assemble graph
const workflow = new StateGraph(StateAnnotation)
  .addNode('executeCode', executeCodeNode)
  .addNode('runTests', runTestsNode)
  .addNode('detectBugs', detectBugsNode)
  .addNode('analyzeComplexity', analyzeComplexityNode)
  .addNode('reviewCode', reviewCodeQualityNode)
  .addNode('computeScore', computeEvaluationScoreNode)
  .addNode('classifyVerdict', classifyVerdictNode)
  .addNode('generateFeedback', generateFeedbackNode)
  .addNode('saveEvalResult', saveEvaluationResultNode);

// Setup workflow routing
workflow
  .addEdge(START, 'executeCode')
  .addEdge('executeCode', 'runTests')
  .addConditionalEdges('runTests', decideAfterTests, {
    detectBugs: 'detectBugs',
    analyzeComplexity: 'analyzeComplexity',
  })
  .addEdge('detectBugs', 'analyzeComplexity')
  .addEdge('analyzeComplexity', 'reviewCode')
  .addEdge('reviewCode', 'computeScore')
  .addEdge('computeScore', 'classifyVerdict')
  .addEdge('classifyVerdict', 'generateFeedback')
  .addEdge('generateFeedback', 'saveEvalResult')
  .addEdge('saveEvalResult', END);

export const appGraph = workflow.compile();

/**
 * Main evaluation entrypoint
 */
export async function runEvaluation(input: {
  userId: string;
  problemId: string;
  submittedCode: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  trigger: 'run' | 'submit';
  language?: string;
}): Promise<AgentState> {
  console.log(`🚀 [Agent] Initiating LangGraph workflow for user=${input.userId} problem=${input.problemId}`);
  
  const result = await appGraph.invoke({
    userId: input.userId,
    problemId: input.problemId,
    submittedCode: input.submittedCode,
    testCases: input.testCases,
    trigger: input.trigger,
    language: input.language || 'javascript',
  });

  console.log(`🚀 [Agent] Workflow complete. Verdict: ${result.verdict}. Final score: ${result.evalScore}`);
  return result;
}
