import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state.js';

// Worker node placeholders
const supervisorNode = async (_state: typeof AgentState.State) => {
  console.log('[Supervisor Node] Executing supervisor routing logic...');
  return { nextAgent: 'mentor-agent' };
};

const profileAgentNode = async (_state: typeof AgentState.State) => {
  console.log('[Profile Agent Node] Analyzing skill gaps and profiles...');
  return { nextAgent: 'supervisor' };
};

const problemGenerationNode = async (_state: typeof AgentState.State) => {
  console.log('[Problem Gen Agent] Generating targeted problem...');
  return { nextAgent: 'supervisor' };
};

const evaluationNode = async (_state: typeof AgentState.State) => {
  console.log('[Evaluation Agent] Reviewing user code submission...');
  return { nextAgent: 'supervisor' };
};

const mentorNode = async (_state: typeof AgentState.State) => {
  console.log('[Mentor Agent] Constructing coaching advice...');
  return { nextAgent: END };
};

// Assemble StateGraph
export const workflow = new StateGraph(AgentState)
  .addNode('supervisor', supervisorNode)
  .addNode('profile-agent', profileAgentNode)
  .addNode('problem-generation-agent', problemGenerationNode)
  .addNode('evaluation-agent', evaluationNode)
  .addNode('mentor-agent', mentorNode);
