import { workflow } from './workflow.js';

// Conditional routing selector based on nextAgent parameter
const selectNextNode = (state: { nextAgent: string }) => {
  return state.nextAgent;
};

// Connect edges and compile graph
export const graph = workflow
  .addEdge('__start__', 'supervisor')
  .addConditionalEdges('supervisor', selectNextNode, {
    'profile-agent': 'profile-agent',
    'problem-generation-agent': 'problem-generation-agent',
    'evaluation-agent': 'evaluation-agent',
    'mentor-agent': 'mentor-agent'
  })
  .addEdge('profile-agent', 'supervisor')
  .addEdge('problem-generation-agent', 'supervisor')
  .addEdge('evaluation-agent', 'supervisor')
  .compile();
