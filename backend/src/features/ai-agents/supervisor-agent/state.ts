import { Annotation } from '@langchain/langgraph';

export type SupervisorEventType =
  | 'request_problem'
  | 'request_hint'
  | 'submission_completed'
  | 'submission_failed'
  | 'profile_refresh'
  | 'agent_output';

export type TargetAgent =
  | 'problem-recommendation-agent'
  | 'hint-agent'
  | 'code-review-agent'
  | 'profile-skill-assessment-agent'
  | 'mentor-agent'
  | 'notification-service';

export interface SupervisorDecision {
  userId: string;
  eventType: SupervisorEventType;
  targetAgent: TargetAgent;
  actionType: 'recommend' | 'provide_hint' | 'review_code' | 'refresh_profile' | 'escalate' | 'notify';
  payload: Record<string, unknown>;
  interventions: string[];
  message: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: string;
}

export const AgentState = Annotation.Root({
  userId: Annotation<string>({ reducer: (_x, y) => y ?? '', default: () => '' }),
  sessionId: Annotation<string>({ reducer: (_x, y) => y ?? '', default: () => '' }),
  eventType: Annotation<SupervisorEventType>({
    reducer: (_x, y) => y ?? 'agent_output',
    default: () => 'agent_output',
  }),
  context: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  agentOutputs: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  userProfile: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  roadmap: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  validationErrors: Annotation<string[]>({ reducer: (_x, y) => y ?? [], default: () => [] }),
  conflicts: Annotation<string[]>({ reducer: (_x, y) => y ?? [], default: () => [] }),
  policiesApplied: Annotation<string[]>({ reducer: (_x, y) => y ?? [], default: () => [] }),
  decisions: Annotation<string[]>({ reducer: (x, y) => [...x, ...y], default: () => [] }),
  interventionCount: Annotation<number>({ reducer: (_x, y) => y ?? 0, default: () => 0 }),
  lastAction: Annotation<string>({ reducer: (_x, y) => y ?? '', default: () => '' }),
  decision: Annotation<SupervisorDecision | null>({ reducer: (_x, y) => y ?? null, default: () => null }),
});
