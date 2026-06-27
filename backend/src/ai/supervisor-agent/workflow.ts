import { createSupervisorGraph } from "./graph.js";
import { AgentState } from "./state.js";
import { createSupervisorCallback } from '../../providers/langfuse/langchain.js';

export type SupervisorWorkflowInput = typeof AgentState.Update;

export interface SupervisorWorkflowOptions {
  userId?: string;
  sessionId?: string;
}

const workflowBuilder = createSupervisorGraph();

export const workflow = workflowBuilder.compile();
export const graph = workflow;

export async function runSupervisorWorkflow(
  input: SupervisorWorkflowInput,
  options: SupervisorWorkflowOptions = {},
) {
  const callback = createSupervisorCallback(options);

  return workflow.invoke(input, {
    configurable: {
      thread_id: options.sessionId,
    },
    callbacks: callback ? [callback] : undefined,
    runName: 'supervisor-workflow',
    tags: ['supervisor-agent', 'langgraph'],
    metadata: {
      langfuseUserId: options.userId,
      langfuseSessionId: options.sessionId,
      feature: 'supervisor-agent',
    },
  });
}
