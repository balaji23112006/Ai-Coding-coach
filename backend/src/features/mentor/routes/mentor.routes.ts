import { Router } from 'express';
import { groq } from '../../../providers/groq/index.js';
import { openaiChat, isOpenAIConfigured } from '../../../providers/openai/index.js';
import { runMentorAgent } from '../../../ai/mentor-agent/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { auth } from '../../../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

const router = Router();

/**
 * POST /api/mentor/hint
 *
 * Full agentic Mentor workflow:
 * - Fetches hint history
 * - Fetches question metadata
 * - Classifies error type (syntax / logic / timeout / request)
 * - Escalates hint level based on previous hints
 * - Generates Socratic guidance (no complete solutions)
 * - Runs guardrail safety check
 * - Saves hint to history
 *
 * Body:
 *   userId?          string
 *   questionId?      string
 *   sourceCode       string
 *   language         string
 *   executionResult? { status, stdout, stderr, executionTime }
 *   messages?        Array<{ role: 'user' | 'bot', text: string }>
 *   triggerEvent?    'compile_error' | 'runtime_error' | 'test_fail' | 'timeout' | 'hint_request' | 'chat'
 *   userQuestion?    string
 *
 * Response:
 *   { mentorFeedback: string, hintMetadata: { category, level, targetedConcept } }
 */
router.post('/hint', async (req, res, next) => {
  // Optional auth middleware extraction inline
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }).catch(() => null);
    if (session) {
      (req as any).user = session.user;
    }
  } catch {}

  try {
    const userId = (req as any).user?.id;
    const result = await runMentorAgent({
      ...req.body,
      userId: req.body.userId || userId,
    });
    return res.status(200).json(result);
  } catch (err) {
    logger.error('[MentorRoutes] /hint failed:', err);
    next(err);
  }
});

/**
 * POST /api/mentor/chat
 *
 * Legacy simple chat endpoint — kept for backward compatibility.
 * Tries OpenAI first, then falls back to Groq.
 * New integrations should use /api/mentor/hint instead.
 */
router.post('/chat', async (req, res, _next) => {
  try {
    const { messages, questionTitle, questionDescription, userCode, errorOutput } = req.body;

    const systemPrompt = `
You are the Mentor Agent for the AI-Powered Coding Practice Coach (Skill Lens).
Your purpose is to act as a supportive coding coach.
Strict Rules:
1. Do NOT write or provide complete code solutions.
2. Guide the user conceptually using progressive hints, asking clarifying questions, or pointing out logical mistakes in their code.
3. Identify syntax, compilation, runtime, logical, time complexity, and space complexity issues when visible.
4. Explain why an error occurs and how to fix the idea without rewriting the whole program.
5. Suggest edge cases and test cases.
6. Be brief, encouraging, and clear.

Context:
- Current Coding Question: "${questionTitle}"
- Description: ${questionDescription}
${userCode ? `- User's Code:\n\`\`\`\n${userCode}\n\`\`\`` : ''}
${errorOutput ? `- Code Execution Output/Errors:\n\`\`\`\n${errorOutput}\n\`\`\`` : ''}
`;

    let reply = '';

    // Try OpenAI first
    if (isOpenAIConfigured()) {
      try {
        const userMsg = messages.map((m: any) => `${m.role === 'bot' ? 'Mentor' : 'Student'}: ${m.text}`).join('\n');
        reply = await openaiChat({
          systemPrompt,
          userMessage: userMsg,
          temperature: 0.2,
          maxTokens: 500,
        });
      } catch (e) {
        logger.warn(`[MentorChat] OpenAI failed, falling back to Groq: ${e}`);
      }
    }

    // Fallback to Groq
    if (!reply) {
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.text,
        })),
      ];

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: formattedMessages as any,
        temperature: 0.2,
        max_tokens: 500,
      });

      reply =
        response.choices[0]?.message?.content ||
        "I'm having trouble thinking of a hint right now. Try reviewing your approach!";
    }

    res.json({ reply });
  } catch (err) {
    console.error('[AI Mentor Router] Error:', err);
    res.json({
      reply: "I couldn't reach the AI server, but here is a tip: make sure you verify edge cases (like empty inputs or single elements) and dry run your loops on paper!",
    });
  }
});

export default router;
