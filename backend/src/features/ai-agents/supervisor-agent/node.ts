import { prisma } from '../../../database/prisma.js';
import { logger } from '../../../utils/logger.js';
import { persistSupervisorDecision } from './decision-store.js';
import { AgentState, type SupervisorDecision, type TargetAgent } from './state.js';

type State = typeof AgentState.State;

export async function collectAgentOutputs(state: State) {
  return {
    agentOutputs: state.agentOutputs,
    decisions: ['Collected triggering event and available agent outputs.'],
    lastAction: 'collect_agent_outputs',
  };
}

export async function getUserProfileAndRoadmap(state: State) {
  if (!state.userId) {
    return { validationErrors: ['userId is required.'], lastAction: 'get_user_profile' };
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: state.userId } });
  return {
    userProfile: profile
      ? {
          level: profile.experienceLevel || 'Beginner',
          solvedCount: profile.solvedCount,
          easySolved: profile.easySolved,
          mediumSolved: profile.mediumSolved,
          hardSolved: profile.hardSolved,
        }
      : { level: 'Beginner', solvedCount: 0 },
    roadmap: profile
      ? {
          learningTrack: profile.learningTrack || 'general',
          recommendedFocus: profile.recommendedFocus || 'arrays',
          recommendedDifficulty: profile.recommendedDifficulty || 'Easy',
        }
      : { learningTrack: 'general', recommendedFocus: 'arrays', recommendedDifficulty: 'Easy' },
    decisions: ['Loaded learner profile and roadmap context.'],
    lastAction: 'get_user_profile_and_roadmap',
  };
}

export function validateAgentOutputs(state: State) {
  const errors = [...state.validationErrors];
  if (!state.userId) errors.push('userId is required.');
  if (!state.eventType) errors.push('eventType is required.');
  if (state.eventType === 'agent_output' && Object.keys(state.agentOutputs).length === 0) {
    errors.push('agent_output events require agentOutputs.');
  }
  return { validationErrors: errors, conflicts: errors, lastAction: 'validate_agent_outputs' };
}

export function resolveConflicts(state: State) {
  return {
    conflicts: [],
    decisions: [...state.conflicts.map((conflict) => `Resolved conflict: ${conflict}`)],
    lastAction: 'resolve_conflicts',
  };
}

export function applyPolicies(state: State) {
  const policies = ['hint-limit:3', 'difficulty-aligned-to-roadmap'];
  const hintLevel = Number(state.context.hintLevel || 0);
  const interventionCount = hintLevel >= 3 ? state.interventionCount + 1 : state.interventionCount;
  return { policiesApplied: policies, interventionCount, lastAction: 'apply_policies' };
}

export function analyzeOverallContext(state: State) {
  const failedAttempts = Number(state.context.failedAttempts || 0);
  const needsIntervention = failedAttempts >= 3 || state.interventionCount > 0;
  return {
    context: { needsIntervention, failedAttempts },
    decisions: ['Analyzed learner progress, roadmap alignment, and intervention conditions.'],
    lastAction: 'analyze_overall_context',
  };
}

export function decideNextAction(state: State) {
  const needsIntervention = Boolean(state.context.needsIntervention);
  let targetAgent: TargetAgent = 'problem-recommendation-agent';
  let actionType: SupervisorDecision['actionType'] = 'recommend';
  let message = 'Next problem recommended.';

  if (needsIntervention) {
    targetAgent = 'mentor-agent';
    actionType = 'escalate';
    message = 'Mentor intervention requested after repeated difficulty.';
  } else if (state.eventType === 'request_hint') {
    targetAgent = 'hint-agent';
    actionType = 'provide_hint';
    message = 'Hint requested.';
  } else if (state.eventType === 'submission_completed' || state.eventType === 'submission_failed') {
    targetAgent = 'code-review-agent';
    actionType = 'review_code';
    message = 'Submission routed for code review.';
  } else if (state.eventType === 'profile_refresh') {
    targetAgent = 'profile-skill-assessment-agent';
    actionType = 'refresh_profile';
    message = 'Profile refresh requested.';
  }

  const decision: SupervisorDecision = {
    userId: state.userId,
    eventType: state.eventType,
    targetAgent,
    actionType,
    payload: {
      topic: state.roadmap.recommendedFocus || 'arrays',
      difficulty: state.roadmap.recommendedDifficulty || 'Easy',
      context: state.context,
    },
    interventions: needsIntervention ? ['mentor_escalation'] : [],
    message,
    priority: needsIntervention ? 'high' : 'normal',
    timestamp: new Date().toISOString(),
  };
  return { decision, lastAction: 'decide_next_action' };
}

export function escalateIntervention(state: State) {
  return {
    decisions: ['Escalated to mentor agent.'],
    interventionCount: state.interventionCount + 1,
    lastAction: 'escalate_intervention',
  };
}

export function prepareDecisionOutput(state: State) {
  if (!state.decision) throw new Error('Supervisor decision was not created.');
  return { decisions: [`Prepared ${state.decision.actionType} decision.`], lastAction: 'prepare_decision_output' };
}

export async function logSupervisorDecision(state: State) {
  if (!state.decision) throw new Error('Cannot log a missing supervisor decision.');
  await persistSupervisorDecision(state.decision);
  logger.info('[Supervisor] Decision created', { decision: state.decision });
  return { decisions: ['Logged supervisor decision.'], lastAction: 'log_supervisor_decision' };
}

export function triggerNextAgent(state: State) {
  if (!state.decision) throw new Error('Cannot trigger next agent without a decision.');
  return { decisions: [`Triggered ${state.decision.targetAgent}.`], lastAction: 'trigger_next_agent' };
}
