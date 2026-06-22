/**
 * Mentor Agent Orchestrator
 *
 * Implements the full agentic workflow:
 * 1.  Fetch hint history
 * 2.  Fetch question metadata
 * 3.  Classify error type
 * 4.  Identify concept gap
 * 5.  Determine hint escalation level
 * 6.  Build Socratic system prompt
 * 7.  Call LLM with FREE provider chain:
 *       Groq (Llama 3.3 70B – free)
 *       → Gemini Flash        (free)
 *       → HuggingFace         (free)
 *       → OpenAI GPT-4o-mini  (paid, optional)
 *       → Static fallback     (always works)
 * 8.  Run guardrail check
 * 9.  Save hint to history
 * 10. Return structured mentor response
 */

import { groqChat, isGroqConfigured } from '../../providers/groq/index.js';
import { geminiChat } from '../../providers/google/index.js';
import { huggingFaceChat, isHuggingFaceConfigured } from '../../providers/huggingface/index.js';
import { openaiChat, isOpenAIConfigured } from '../../providers/openai/index.js';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../shared/utils/logger.js';

import { MentorRequest, MentorResponse, HintLevel } from './types.js';
import { getHintHistory, saveHint, getCachedHint, cacheHint } from './hint-store.js';
import { classifyError, identifyConcept } from './classifier.js';
import { determineHintLevel } from './escalation.js';
import { checkGuardrail, getFallbackResponse } from './guardrail.js';
import { buildMentorSystemPrompt } from './prompts.js';
import { agentLogger } from '../profile-agent/services/AgentLogger.js';
import { langfuse } from '../../providers/langfuse/index.js';
import { sanitizeForTrace } from '../../observability/langfuse.js';

const ANON_USER_ID = 'anonymous';

/**
 * Main entry point for the Mentor Agent.
 * Takes a MentorRequest and returns a structured MentorResponse.
 */
export async function runMentorAgent(request: MentorRequest): Promise<MentorResponse> {
  const userId = request.userId || ANON_USER_ID;
  const questionId = request.questionId || 'general';
  const trigger = request.triggerEvent || 'chat';
  const traceId = `trace-mentor-${userId}-${questionId}-${Date.now()}`;

  // Start AgentLogger trace
  agentLogger.startRun(userId, trigger, traceId);
  agentLogger.logRequest(traceId, request);

  // Start Langfuse Trace
  const trace = langfuse.trace({
    id: traceId,
    name: 'mentor-agent-workflow',
    userId,
    sessionId: questionId,
    tags: ['mentor-agent', trigger],
    metadata: {
      questionId,
      triggerEvent: trigger,
    },
  });

  try {
    logger.info(
      `[MentorAgent] Processing hint for user=${userId} question=${questionId} trigger=${trigger}`,
    );

    // Check backend cache first
    const cachedResponse = getCachedHint(userId, questionId, request.sourceCode, trigger);
    if (cachedResponse) {
      logger.info(`[MentorAgent] ⚡ Cache hit for user=${userId} question=${questionId}`);
      agentLogger.logNodeExecution(traceId, 'Cache Check', { hit: true });
      agentLogger.logDecision(
        traceId,
        'Found matching hint in backend cache. Bypassing LLM calls.',
      );
      agentLogger.logResponse(traceId, cachedResponse);
      await agentLogger.finalizeRun(traceId, 'completed');

      trace.update({
        output: sanitizeForTrace(cachedResponse),
      });
      await langfuse.flushAsync();

      return cachedResponse;
    }
    agentLogger.logNodeExecution(traceId, 'Cache Check', { hit: false });

    // ─── Step 1: Fetch hint history ─────────────────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Fetch History');
    const hintHistory = getHintHistory(userId, questionId);
    logger.info(`[MentorAgent] Found ${hintHistory.length} previous hints`);
    agentLogger.logDecision(traceId, `Found ${hintHistory.length} previous hints`);

    // ─── Step 2: Fetch question metadata ────────────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Fetch Metadata');
    let questionTitle = 'Coding Problem';
    let questionDescription = '';

    if (request.questionId && request.questionId !== 'general') {
      try {
        const question = await prisma.question.findUnique({
          where: { id: request.questionId },
          select: { title: true, description: true },
        });
        if (question) {
          questionTitle = question.title;
          questionDescription = question.description.slice(0, 500);
        }
      } catch (e) {
        logger.warn(`[MentorAgent] Could not fetch question metadata: ${e}`);
      }
    }
    agentLogger.logDecision(traceId, `Question Title: "${questionTitle}"`);

    // ─── Step 3: Classify error type ────────────────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Classify Error');
    const category = classifyError(request);
    logger.info(`[MentorAgent] Classified error category: ${category}`);
    agentLogger.logDecision(traceId, `Classified error category: ${category}`);

    // ─── Step 4: Identify concept gap ───────────────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Identify Concept');
    const targetedConcept = identifyConcept(request, category);
    logger.info(`[MentorAgent] Targeted concept: ${targetedConcept}`);
    agentLogger.logDecision(traceId, `Targeted concept: ${targetedConcept}`);

    // ─── Step 5: Determine hint escalation level ─────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Determine Escalation');
    const level = determineHintLevel(hintHistory);
    logger.info(`[MentorAgent] Hint escalation level: ${level}`);
    agentLogger.logDecision(traceId, `Hint escalation level: ${level}`);

    // ─── Step 6: Build Socratic system prompt ────────────────────────────────────
    const executionOutput = [request.executionResult?.stdout, request.executionResult?.stderr]
      .filter(Boolean)
      .join('\n')
      .slice(0, 500);

    const systemPrompt = buildMentorSystemPrompt({
      category,
      level: level as HintLevel,
      targetedConcept,
      questionTitle,
      questionDescription,
      sourceCode: request.sourceCode,
      executionOutput,
      previousHints: hintHistory,
      userQuestion: request.userQuestion,
    });

    // ─── Step 7: Call LLM — FREE provider chain ────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Call LLM');
    let mentorFeedback = '';
    let providerUsed = 'static-fallback';

    // Build a single user message combining chat history + trigger context
    let userMessage = '';

    if (request.messages && request.messages.length > 0) {
      const recentMessages = request.messages.slice(-6);
      userMessage = recentMessages
        .map((m) => `${m.role === 'bot' ? 'Mentor' : 'Student'}: ${m.text}`)
        .join('\n');
      userMessage += '\n';
    }

    if (request.userQuestion) {
      userMessage += `Student: ${request.userQuestion}`;
    } else {
      userMessage += `Student: ${buildTriggerMessage(request)}`;
    }

    const llmParams = {
      systemPrompt,
      userMessage,
      temperature: 0.3,
      maxTokens: 8192,
      userId,
      sessionId: questionId,
    };

    // ── 1. Groq (FREE – primary) ───────────────────────────────────────────────
    if (!mentorFeedback && isGroqConfigured()) {
      try {
        mentorFeedback = await groqChat(llmParams);
        providerUsed = 'groq';
        logger.info('[MentorAgent] ✅ Response from Groq (free primary)');
        agentLogger.logDecision(traceId, 'Response received from Groq LLM');
      } catch (e) {
        logger.warn(`[MentorAgent] Groq failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── 2. Gemini Flash (FREE – fallback) ─────────────────────────────────────
    if (!mentorFeedback) {
      try {
        mentorFeedback = await geminiChat(llmParams);
        providerUsed = 'gemini';
        logger.info('[MentorAgent] ✅ Response from Gemini (free fallback)');
        agentLogger.logDecision(traceId, 'Response received from Gemini LLM');
      } catch (e) {
        logger.warn(`[MentorAgent] Gemini failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── 3. HuggingFace (FREE – fallback) ──────────────────────────────────────
    if (!mentorFeedback && isHuggingFaceConfigured()) {
      try {
        mentorFeedback = await huggingFaceChat(llmParams);
        providerUsed = 'huggingface';
        logger.info('[MentorAgent] ✅ Response from HuggingFace (free fallback)');
        agentLogger.logDecision(traceId, 'Response received from HuggingFace LLM');
      } catch (e) {
        logger.warn(
          `[MentorAgent] HuggingFace failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // ── 4. OpenAI (paid – optional upgrade) ───────────────────────────────────
    if (!mentorFeedback && isOpenAIConfigured()) {
      try {
        mentorFeedback = await openaiChat(llmParams);
        providerUsed = 'openai';
        logger.info('[MentorAgent] ✅ Response from OpenAI (paid upgrade)');
        agentLogger.logDecision(traceId, 'Response received from OpenAI LLM');
      } catch (e) {
        logger.warn(`[MentorAgent] OpenAI failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ── 5. Static fallback (always works) ─────────────────────────────────────
    if (!mentorFeedback) {
      logger.warn('[MentorAgent] All LLM providers failed — using static fallback');
      agentLogger.logDecision(traceId, 'All LLMs failed or bypassed. Using static fallback.');
    }

    // Log the prompt and raw LLM response in AgentLogger
    agentLogger.logPrompt(
      traceId,
      providerUsed,
      `[SYSTEM PROMPT]:\n${systemPrompt}\n\n[USER MESSAGE]:\n${userMessage}`,
      mentorFeedback || '[Fallback Used]',
    );

    // ─── Step 8: Run guardrail check ────────────────────────────────────────────
    agentLogger.logNodeExecution(traceId, 'Check Guardrail');
    if (mentorFeedback) {
      const guardrailResult = checkGuardrail(mentorFeedback);
      if (!guardrailResult.passed) {
        logger.warn(`[MentorAgent] Guardrail triggered: ${guardrailResult.reason}`);
        agentLogger.logDecision(
          traceId,
          `Guardrail triggered: ${guardrailResult.reason}. Overriding response.`,
        );
        mentorFeedback = getFallbackResponse(category, level);
      }
    } else {
      // LLM failed or returned empty — use fallback
      mentorFeedback = getFallbackResponse(category, level);
    }

    // ─── Step 9: Save hint to history ───────────────────────────────────────────
    const savedAt = new Date().toISOString();

    saveHint({
      userId,
      questionId,
      category,
      level: level as HintLevel,
      targetedConcept,
      feedback: mentorFeedback,
      timestamp: savedAt,
    });

    // ─── Step 10: Return structured response ────────────────────────────────────
    const response: MentorResponse = {
      mentorFeedback,
      hintMetadata: {
        category,
        level: level as HintLevel,
        targetedConcept,
      },
      workflow: {
        triggeredBy: request.triggerEvent || 'chat',
        savedAt,
        providerPreference: ['groq', 'gemini', 'huggingface', 'openai', 'static-fallback'],
      },
    };

    logger.info(
      `[MentorAgent] Done. Level=${level}, Category=${category}, Concept=${targetedConcept}`,
    );

    // Cache the response
    cacheHint(userId, questionId, request.sourceCode, trigger, response);

    // Log final response
    agentLogger.logResponse(traceId, response);
    await agentLogger.finalizeRun(traceId, 'completed');

    // Langfuse trace logging
    trace.update({
      output: sanitizeForTrace(response),
    });
    await langfuse.flushAsync();

    return response;
  } catch (error: any) {
    logger.error('[MentorAgent] Execution failed:', error);

    // Log failures
    await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));

    trace.update({
      output: { error: error.message || String(error) },
    });
    await langfuse.flushAsync();

    throw error;
  }
}

/**
 * Builds an auto-trigger user message when no explicit question is given.
 */
function buildTriggerMessage(request: MentorRequest): string {
  const trigger = request.triggerEvent;

  if (trigger === 'compile_error') {
    return 'My code has a compilation error. Can you help me understand what is wrong?';
  }
  if (trigger === 'runtime_error') {
    return 'My code is crashing at runtime. Can you help me figure out why?';
  }
  if (trigger === 'test_fail') {
    return 'Some of my test cases are failing. Can you give me a hint about what might be wrong with my logic?';
  }
  if (trigger === 'timeout') {
    return 'My solution is too slow and exceeds the time limit. Can you give me a hint about how to make it faster?';
  }
  if (trigger === 'hint_request') {
    return 'I am stuck. Can you give me a hint without telling me the full solution?';
  }

  return 'I need some guidance on this problem.';
}
