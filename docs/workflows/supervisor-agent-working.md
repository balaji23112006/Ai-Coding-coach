# Supervisor Agent Working

This document explains the exact working of the Supervisor Agent in this project.

The Supervisor Agent is the orchestration layer for the AI coding coach system. It does not solve problems, generate hints, review code, or update learner profiles by itself. Its job is to receive an event, inspect the user state and agent outputs, apply routing rules, create a decision, log that decision, and tell the system which agent should act next.

Current implementation path:

```text
backend/src/ai/supervisor-agent/
```

API route:

```text
POST /api/ai/supervisor/run
```

Mounted from:

```text
backend/src/app.ts
```

---

## High-level purpose

The Supervisor Agent works like a traffic controller between the different learning agents.

It answers:

- What event happened?
- Which learner/session does it belong to?
- Is the learner stuck or progressing normally?
- Is the request asking for a problem, hint, review, or profile refresh?
- Should the next action be handled by the problem recommendation agent, hint agent, code review agent, profile agent, mentor agent, or notification service?
- What payload should be sent forward?
- Should this decision be stored for future audit/debugging?

At the moment, the routing is deterministic/rule-based. It is not asking Gemini to decide the routing. Gemini can still be used by downstream agents, but the supervisor's current decision logic is implemented in TypeScript rules.

---

## Main files and their roles

### `state.ts`

Defines the state shape used by the LangGraph workflow.

Important types:

- `SupervisorEventType`
- `TargetAgent`
- `SupervisorDecision`
- `AgentState`

Supported event types:

```ts
'request_problem'
'request_hint'
'submission_completed'
'submission_failed'
'profile_refresh'
'agent_output'
```

Supported target agents:

```ts
'problem-recommendation-agent'
'hint-agent'
'code-review-agent'
'profile-skill-assessment-agent'
'mentor-agent'
'notification-service'
```

The graph state stores:

- `userId`
- `sessionId`
- `eventType`
- `context`
- `agentOutputs`
- `userProfile`
- `roadmap`
- `validationErrors`
- `conflicts`
- `policiesApplied`
- `decisions`
- `interventionCount`
- `lastAction`
- `decision`

The `decisions` array is a workflow log. It shows what the supervisor did step-by-step.

---

### `graph.ts`

Defines the LangGraph workflow structure.

Current graph flow:

```text
START
  ↓
collect_agent_outputs
  ↓
get_user_profile_and_roadmap
  ↓
validate_agent_outputs
  ↓
if conflicts exist:
    resolve_conflicts
  ↓
apply_policies
  ↓
analyze_overall_context
  ↓
decide_next_action
  ↓
if actionType is "escalate":
    escalate_intervention
  ↓
prepare_decision_output
  ↓
log_supervisor_decision
  ↓
trigger_next_agent
  ↓
END
```

So the supervisor always follows this lifecycle:

1. Collect input.
2. Load user profile and roadmap.
3. Validate the event.
4. Resolve conflicts if any exist.
5. Apply platform policies.
6. Analyze learner context.
7. Decide the next target agent/action.
8. Escalate if needed.
9. Prepare response.
10. Persist/log decision.
11. Return the chosen target agent.

---

### `node.ts`

Contains the actual logic for every graph step.

#### `collectAgentOutputs`

Keeps the provided `agentOutputs` in state and records that the event/output was collected.

Adds workflow log:

```text
Collected triggering event and available agent outputs.
```

#### `getUserProfileAndRoadmap`

Loads the learner profile from Prisma:

```ts
prisma.userProfile.findUnique({ where: { userId: state.userId } })
```

If a profile exists, it maps profile fields into:

- learner level
- solved count
- easy/medium/hard solved count
- learning track
- recommended focus
- recommended difficulty

If no profile exists, it uses default values:

```ts
userProfile: {
  level: 'Beginner',
  solvedCount: 0
}

roadmap: {
  learningTrack: 'general',
  recommendedFocus: 'arrays',
  recommendedDifficulty: 'Easy'
}
```

#### `validateAgentOutputs`

Checks basic validity:

- `userId` must exist.
- `eventType` must exist.
- If `eventType` is `agent_output`, then `agentOutputs` must not be empty.

Validation errors are also treated as conflicts.

#### `resolveConflicts`

Currently clears the conflict list and records each conflict as resolved.

Example log:

```text
Resolved conflict: userId is required.
```

#### `applyPolicies`

Applies simple platform policies:

```ts
['hint-limit:3', 'difficulty-aligned-to-roadmap']
```

Current policy behavior:

- If `context.hintLevel >= 3`, it increases `interventionCount`.
- This can later cause mentor escalation.

#### `analyzeOverallContext`

Checks if the user needs intervention.

Current intervention conditions:

- `context.failedAttempts >= 3`
- OR `interventionCount > 0`

It writes these values back into `context`:

```ts
{
  needsIntervention: boolean,
  failedAttempts: number
}
```

#### `decideNextAction`

This is the core routing function.

It creates the final `SupervisorDecision`.

Current routing rules:

| Condition | Target agent | Action type | Priority |
|---|---|---|---|
| `needsIntervention === true` | `mentor-agent` | `escalate` | `high` |
| `eventType === 'request_hint'` | `hint-agent` | `provide_hint` | `normal` |
| `eventType === 'submission_completed'` | `code-review-agent` | `review_code` | `normal` |
| `eventType === 'submission_failed'` | `code-review-agent` | `review_code` | `normal` |
| `eventType === 'profile_refresh'` | `profile-skill-assessment-agent` | `refresh_profile` | `normal` |
| Default / `request_problem` | `problem-recommendation-agent` | `recommend` | `normal` |

Important: intervention has the highest priority. For example, if the event asks for a hint but `failedAttempts >= 3`, the supervisor routes to `mentor-agent` instead of `hint-agent`.

The decision payload contains:

```ts
{
  topic: state.roadmap.recommendedFocus || 'arrays',
  difficulty: state.roadmap.recommendedDifficulty || 'Easy',
  context: state.context
}
```

#### `escalateIntervention`

Runs only when the decision action is `escalate`.

It:

- adds a workflow log saying escalation happened
- increments `interventionCount`

#### `prepareDecisionOutput`

Checks that a decision exists and adds a log like:

```text
Prepared recommend decision.
```

or:

```text
Prepared escalate decision.
```

#### `logSupervisorDecision`

Persists the final decision using `persistSupervisorDecision`.

It also logs the decision through the app logger.

#### `triggerNextAgent`

Adds a final workflow log:

```text
Triggered problem-recommendation-agent.
```

Important: this currently records which agent should be triggered. It does not yet call another HTTP endpoint or execute the downstream agent implementation directly. To make it fully integrated, a dispatcher can be added here later.

---

### `decision-store.ts`

Stores supervisor decisions in a JSON file:

```text
backend/data/supervisor-decisions.json
```

The store:

- creates the `data` folder if missing
- reads existing decisions if the file exists
- adds the newest decision at the top
- keeps only the latest 200 decisions

This file is runtime data and should not be committed to GitHub.

---

### `workflow.ts`

Compiles the LangGraph workflow and exposes:

```ts
runSupervisorWorkflow(input, options)
```

This is the function used by the API route.

It also attaches Langfuse/LangChain callbacks if Langfuse credentials are configured.

Langfuse metadata includes:

- `langfuseUserId`
- `langfuseSessionId`
- `feature: 'supervisor-agent'`
- tags: `supervisor-agent`, `langgraph`

---

### `index.ts`

Standalone local test runner for the supervisor workflow.

It sends a sample input:

```ts
{
  userId: 'demo-user',
  sessionId: 'dev-test-session',
  eventType: 'request_problem',
  context: { topic: 'dynamic-programming', failedAttempts: 0 },
  agentOutputs: {}
}
```

Then prints:

- final supervisor decision
- workflow log

This file is useful for testing the supervisor without using the Express API.

---

### `supervisor.routes.ts`

Defines the backend API route:

```text
POST /api/ai/supervisor/run
```

Request body validation is done with Zod.

Required:

- `userId`
- `eventType`

Optional:

- `sessionId`
- `context`
- `agentOutputs`

If validation fails, the API returns:

```json
{
  "error": "Invalid supervisor event.",
  "details": {}
}
```

If validation passes, it runs:

```ts
runSupervisorWorkflow(...)
```

and returns:

```json
{
  "decision": {},
  "decisions": []
}
```

---

## API request example

PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/ai/supervisor/run `
  -ContentType 'application/json' `
  -Body '{"userId":"demo-user","sessionId":"test-001","eventType":"request_problem","context":{"topic":"arrays","failedAttempts":0},"agentOutputs":{}}'
```

Expected routing:

```text
request_problem → problem-recommendation-agent
```

Expected action:

```text
recommend
```

Expected workflow log:

```json
[
  "Collected triggering event and available agent outputs.",
  "Loaded learner profile and roadmap context.",
  "Analyzed learner progress, roadmap alignment, and intervention conditions.",
  "Prepared recommend decision.",
  "Logged supervisor decision.",
  "Triggered problem-recommendation-agent."
]
```

---

## Example output decision

For this input:

```json
{
  "userId": "demo-user",
  "sessionId": "test-001",
  "eventType": "request_problem",
  "context": {
    "topic": "arrays",
    "failedAttempts": 0
  },
  "agentOutputs": {}
}
```

The supervisor should produce a decision like:

```json
{
  "userId": "demo-user",
  "eventType": "request_problem",
  "targetAgent": "problem-recommendation-agent",
  "actionType": "recommend",
  "payload": {
    "topic": "arrays",
    "difficulty": "Easy",
    "context": {
      "topic": "arrays",
      "failedAttempts": 0,
      "needsIntervention": false
    }
  },
  "interventions": [],
  "message": "Next problem recommended.",
  "priority": "normal",
  "timestamp": "2026-06-24T08:51:05.380Z"
}
```

The exact timestamp changes every run.

---

## Testing different routes

### Route to hint agent

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/ai/supervisor/run `
  -ContentType 'application/json' `
  -Body '{"userId":"demo-user","sessionId":"test-hint","eventType":"request_hint","context":{"topic":"arrays","failedAttempts":1},"agentOutputs":{}}'
```

Expected:

```text
targetAgent: hint-agent
actionType: provide_hint
```

### Route to code review agent

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/ai/supervisor/run `
  -ContentType 'application/json' `
  -Body '{"userId":"demo-user","sessionId":"test-review","eventType":"submission_completed","context":{"topic":"arrays","failedAttempts":0},"agentOutputs":{}}'
```

Expected:

```text
targetAgent: code-review-agent
actionType: review_code
```

### Route to profile agent

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/ai/supervisor/run `
  -ContentType 'application/json' `
  -Body '{"userId":"demo-user","sessionId":"test-profile","eventType":"profile_refresh","context":{},"agentOutputs":{}}'
```

Expected:

```text
targetAgent: profile-skill-assessment-agent
actionType: refresh_profile
```

### Route to mentor agent through escalation

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/ai/supervisor/run `
  -ContentType 'application/json' `
  -Body '{"userId":"demo-user","sessionId":"test-mentor","eventType":"request_hint","context":{"topic":"arrays","failedAttempts":3},"agentOutputs":{}}'
```

Expected:

```text
targetAgent: mentor-agent
actionType: escalate
priority: high
interventions: ["mentor_escalation"]
```

---

## How to run the supervisor through backend

Start backend:

```powershell
pnpm.cmd --filter backend dev
```

Then call:

```text
http://localhost:8000/api/ai/supervisor/run
```

If the frontend is calling the backend, it should send events to this API route.

---

## How to run the standalone supervisor test

From the repo root:

```powershell
pnpm.cmd --filter backend exec tsx src/ai/supervisor-agent/index.ts
```

This runs the sample event in `index.ts`.

---

## Langfuse tracing

The supervisor workflow uses Langfuse through the LangChain callback integration.

Tracing is attached inside:

```text
backend/src/ai/supervisor-agent/workflow.ts
```

The callback is created from:

```text
backend/src/providers/langfuse/langchain.ts
```

If Langfuse credentials are present in environment variables, the workflow will send traces. If credentials are missing, the workflow still runs normally without tracing.

Typical Langfuse environment variables:

```env
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASEURL=
```

Do not commit real Langfuse keys to GitHub.

---

## Current limitations

The Supervisor Agent is working as an orchestration decision engine, but there are a few important limits:

1. It chooses the next target agent, but does not yet directly execute that target agent.
2. Routing is currently rule-based, not LLM-based.
3. Conflict resolution is basic and currently clears validation conflicts after recording them.
4. Decisions are persisted to a local JSON file, not a database table.
5. `notification-service` is defined as a possible target but is not currently selected by the routing rules.

---

## What “working properly” means right now

The supervisor is working properly if:

- `/api/ai/supervisor/run` accepts valid events.
- Invalid events return a validation error.
- `request_problem` routes to `problem-recommendation-agent`.
- `request_hint` routes to `hint-agent`, unless intervention is needed.
- `submission_completed` and `submission_failed` route to `code-review-agent`.
- `profile_refresh` routes to `profile-skill-assessment-agent`.
- `failedAttempts >= 3` routes to `mentor-agent`.
- The response contains both `decision` and `decisions`.
- A decision is saved into `backend/data/supervisor-decisions.json`.
- Langfuse traces appear when Langfuse environment variables are configured.

---

## Future improvement: actual downstream agent execution

Right now, this line in the workflow means “the supervisor selected this agent”:

```text
Triggered problem-recommendation-agent.
```

To make it fully integrated, `triggerNextAgent` can be upgraded into a dispatcher that actually calls the selected agent.

Example future behavior:

```text
targetAgent = problem-recommendation-agent
  → call problem recommendation service
  → return recommended problem
```

```text
targetAgent = hint-agent
  → call hint generation service
  → return hint
```

```text
targetAgent = mentor-agent
  → create mentor intervention / notification
  → return escalation status
```

That would convert the supervisor from “decision + routing output” into “decision + real execution”.
