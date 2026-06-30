import { graph } from '../../ai/supervisor-agent/workflow.js';

/**
 * LangGraph Workflow Runner
 * Executes the compiled multi-agent state graph.
 */
export const runAgentWorkflow = async (
  inputState: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  console.warn('[LangGraph Provider] Invoking supervisor graph workflow...');
  try {
    const result = await graph.invoke(inputState);
    return result;
  } catch (error) {
    console.error('[LangGraph Provider] Workflow execution failed:', error);
    throw error;
  }
};
