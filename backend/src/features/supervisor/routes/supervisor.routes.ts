import { Router } from 'express';
import { z } from 'zod';
import { runSupervisorWorkflow } from '../../../ai/supervisor-agent/workflow.js';
import { agentLogger } from '../../../ai/profile-agent/services/AgentLogger.js';

const router = Router();

const eventSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  eventType: z.enum([
    'request_problem',
    'request_hint',
    'submission_completed',
    'submission_failed',
    'profile_refresh',
    'agent_output',
  ]),
  context: z.record(z.string(), z.unknown()).optional(),
  agentOutputs: z.record(z.string(), z.unknown()).optional(),
});

router.post('/run', async (req, res, next) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid supervisor event.', details: parsed.error.flatten() });
    return;
  }

  const event = parsed.data;
  const traceId = `trace-sup-${event.userId}-${Date.now()}`;
  agentLogger.startRun(event.userId, 'supervisor', traceId);
  agentLogger.logRequest(traceId, event);

  try {
    const result = await runSupervisorWorkflow(
      {
        userId: event.userId,
        sessionId: event.sessionId || `session-${event.userId}-${Date.now()}`,
        eventType: event.eventType,
        context: event.context || {},
        agentOutputs: event.agentOutputs || {},
      },
      { userId: event.userId, sessionId: event.sessionId },
    );

    if (result.decisions) {
      result.decisions.forEach((decision: string) => {
        agentLogger.logDecision(traceId, decision);
      });
    }

    if (result.lastAction) {
      agentLogger.logNodeExecution(traceId, result.lastAction, { decision: result.decision });
    }

    agentLogger.logResponse(traceId, { decision: result.decision, decisions: result.decisions });
    await agentLogger.finalizeRun(traceId, 'completed');

    res.status(200).json({ decision: result.decision, decisions: result.decisions });
  } catch (error: any) {
    await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));
    next(error);
  }
});

export default router;
