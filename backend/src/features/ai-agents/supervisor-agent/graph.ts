import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from './state.js';
import {
  analyzeOverallContext, applyPolicies, collectAgentOutputs, decideNextAction, escalateIntervention,
  getUserProfileAndRoadmap, logSupervisorDecision, prepareDecisionOutput, resolveConflicts,
  triggerNextAgent, validateAgentOutputs,
} from './node.js';

export function createSupervisorGraph() {
  const graph = new StateGraph(AgentState)
    .addNode('collect_agent_outputs', collectAgentOutputs)
    .addNode('get_user_profile_and_roadmap', getUserProfileAndRoadmap)
    .addNode('validate_agent_outputs', validateAgentOutputs)
    .addNode('resolve_conflicts', resolveConflicts)
    .addNode('apply_policies', applyPolicies)
    .addNode('analyze_overall_context', analyzeOverallContext)
    .addNode('decide_next_action', decideNextAction)
    .addNode('escalate_intervention', escalateIntervention)
    .addNode('prepare_decision_output', prepareDecisionOutput)
    .addNode('log_supervisor_decision', logSupervisorDecision)
    .addNode('trigger_next_agent', triggerNextAgent)
    .addEdge(START, 'collect_agent_outputs')
    .addEdge('collect_agent_outputs', 'get_user_profile_and_roadmap')
    .addEdge('get_user_profile_and_roadmap', 'validate_agent_outputs')
    .addConditionalEdges('validate_agent_outputs', (state) => state.conflicts.length > 0 ? 'resolve_conflicts' : 'apply_policies')
    .addEdge('resolve_conflicts', 'apply_policies')
    .addEdge('apply_policies', 'analyze_overall_context')
    .addEdge('analyze_overall_context', 'decide_next_action')
    .addConditionalEdges('decide_next_action', (state) => state.decision?.actionType === 'escalate' ? 'escalate_intervention' : 'prepare_decision_output')
    .addEdge('escalate_intervention', 'prepare_decision_output')
    .addEdge('prepare_decision_output', 'log_supervisor_decision')
    .addEdge('log_supervisor_decision', 'trigger_next_agent')
    .addEdge('trigger_next_agent', END);
  return graph;
}
