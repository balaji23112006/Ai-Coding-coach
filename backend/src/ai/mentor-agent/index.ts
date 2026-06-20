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

import { groqChat,         isGroqConfigured }         from '../../providers/groq/index.js';
import { geminiChat }                                  from '../../providers/google/index.js';
import { huggingFaceChat, isHuggingFaceConfigured }   from '../../providers/huggingface/index.js';
import { openaiChat,      isOpenAIConfigured }         from '../../providers/openai/index.js';
import { prisma }                                      from '../../database/prisma.js';
import { logger }                                      from '../../shared/utils/logger.js';

import { MentorRequest, MentorResponse, HintLevel } from './types.js';
import { getHintHistory, saveHint }                  from './hint-store.js';
import { classifyError, identifyConcept }             from './classifier.js';
import { determineHintLevel }                         from './escalation.js';
import { checkGuardrail, getFallbackResponse }        from './guardrail.js';
import { buildMentorSystemPrompt }                    from './prompts.js';

const ANON_USER_ID = 'anonymous';

/**
 * Main entry point for the Mentor Agent.
 * Takes a MentorRequest and returns a structured MentorResponse.
 */
export async function runMentorAgent(request: MentorRequest): Promise<MentorResponse> {
  const userId = request.userId || ANON_USER_ID;
  const questionId = request.questionId || 'general';

  logger.info(`[MentorAgent] Processing hint for user=${userId} question=${questionId} trigger=${request.triggerEvent || 'chat'}`);

  // ─── Step 1: Fetch hint history ─────────────────────────────────────────────
  const hintHistory = getHintHistory(userId, questionId);
  logger.info(`[MentorAgent] Found ${hintHistory.length} previous hints`);

  // ─── Step 2: Fetch question metadata ────────────────────────────────────────
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

  // ─── Step 3: Classify error type ────────────────────────────────────────────
  const category = classifyError(request);
  logger.info(`[MentorAgent] Classified error category: ${category}`);

  // ─── Step 4: Identify concept gap ───────────────────────────────────────────
  const targetedConcept = identifyConcept(request, category);
  logger.info(`[MentorAgent] Targeted concept: ${targetedConcept}`);

  // ─── Step 5: Determine hint escalation level ─────────────────────────────────
  const level = determineHintLevel(hintHistory);
  logger.info(`[MentorAgent] Hint escalation level: ${level}`);

  // ─── Step 6: Build Socratic system prompt ────────────────────────────────────
  const executionOutput = [
    request.executionResult?.stdout,
    request.executionResult?.stderr,
  ]
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
  //
  //  Priority order:
  //   1. Groq       (llama-3.3-70b  – FREE, fast, high quality)
  //   2. Gemini     (gemini-flash   – FREE tier via Google AI Studio)
  //   3. HuggingFace(Mistral-7B     – FREE, slightly slower)
  //   4. OpenAI     (gpt-4o-mini    – paid, optional upgrade)
  //   5. Static fallback            – always works, no LLM needed
  // ────────────────────────────────────────────────────────────────────────────
  let mentorFeedback = '';

  // Build a single user message combining chat history + trigger context
  let userMessage = '';

  if (request.messages && request.messages.length > 0) {
    const recentMessages = request.messages.slice(-6);
    userMessage = recentMessages
      .map(m => `${m.role === 'bot' ? 'Mentor' : 'Student'}: ${m.text}`)
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
      logger.info('[MentorAgent] ✅ Response from Groq (free primary)');
    } catch (e) {
      logger.warn(`[MentorAgent] Groq failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 2. Gemini Flash (FREE – fallback) ─────────────────────────────────────
  if (!mentorFeedback) {
    try {
      mentorFeedback = await geminiChat(llmParams);
      logger.info('[MentorAgent] ✅ Response from Gemini (free fallback)');
    } catch (e) {
      logger.warn(`[MentorAgent] Gemini failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3. HuggingFace (FREE – fallback) ──────────────────────────────────────
  if (!mentorFeedback && isHuggingFaceConfigured()) {
    try {
      mentorFeedback = await huggingFaceChat(llmParams);
      logger.info('[MentorAgent] ✅ Response from HuggingFace (free fallback)');
    } catch (e) {
      logger.warn(`[MentorAgent] HuggingFace failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 4. OpenAI (paid – optional upgrade) ───────────────────────────────────
  if (!mentorFeedback && isOpenAIConfigured()) {
    try {
      mentorFeedback = await openaiChat(llmParams);
      logger.info('[MentorAgent] ✅ Response from OpenAI (paid upgrade)');
    } catch (e) {
      logger.warn(`[MentorAgent] OpenAI failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 5. Static fallback (always works) ─────────────────────────────────────
  if (!mentorFeedback) {
    logger.warn('[MentorAgent] All LLM providers failed — using static fallback');
  }

  // ─── Step 8: Run guardrail check ────────────────────────────────────────────
  if (mentorFeedback) {
    const guardrailResult = checkGuardrail(mentorFeedback);
    if (!guardrailResult.passed) {
      logger.warn(`[MentorAgent] Guardrail triggered: ${guardrailResult.reason}`);
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

  logger.info(`[MentorAgent] Done. Level=${level}, Category=${category}, Concept=${targetedConcept}`);
  return response;
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
