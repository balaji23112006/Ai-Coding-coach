import { Router } from 'express';
import { groq } from '../../../providers/groq/index.js';
import { langfuse } from '../../../providers/langfuse/index.js';
import { auth } from '../../../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

const router = Router();

router.post('/chat', async (req, res, next) => {
  let userId = req.body.userId;
  if (!userId) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session?.user) {
        userId = session.user.id;
      }
    } catch (e) {
      console.error('[AI Mentor Router] Failed to resolve user session:', e);
    }
  }

  const traceId = `trace-chat-${userId || 'anon'}-${Date.now()}`;
  const trace = langfuse.trace({
    id: traceId,
    name: 'mentor-chat',
    userId: userId || 'anonymous',
  });

  let generation: any = null;

  try {
    const { messages, questionTitle, questionDescription, userCode, errorOutput } = req.body;

    const systemPrompt = `
You are the Mentor Agent for the AI-Powered Coding Practice Coach (Skill Lens).
Your purpose is to act as a supportive coding coach.
Strict Rules:
1. Do NOT write or provide complete code solutions.
2. Guide the user conceptually using progressive hints, asking clarifying questions, or pointing out logical mistakes in their code.
3. Be brief, encouraging, and clear.

Context:
- Current Coding Question: "${questionTitle}"
- Description: ${questionDescription}
${userCode ? `- User's Code:\n\`\`\`\n${userCode}\n\`\`\`` : ''}
${errorOutput ? `- Code Execution Output/Errors:\n\`\`\`\n${errorOutput}\n\`\`\`` : ''}
`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text
      }))
    ];

    generation = trace.generation({
      name: 'mentor-chat-generation',
      model: 'llama-3.3-70b-versatile',
      input: formattedMessages,
      startTime: new Date(),
    });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: formattedMessages as any,
      temperature: 0.2,
      max_tokens: 500,
    });

    const reply = response.choices[0]?.message?.content || "I'm having trouble thinking of a hint right now. Try reviewing your approach!";
    
    if (generation) {
      generation.end({
        output: reply,
        endTime: new Date(),
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      });
    }

    await langfuse.flushAsync();
    res.json({ reply });
  } catch (err: any) {
    console.error('[AI Mentor Router] Error:', err);
    if (generation) {
      generation.end({
        output: err instanceof Error ? err.message : String(err),
        endTime: new Date(),
        level: 'ERROR',
        statusMessage: err instanceof Error ? err.message : String(err),
      });
    }
    await langfuse.flushAsync();
    res.json({ 
      reply: "I couldn't reach the AI server, but here is a tip: make sure you verify edge cases (like empty inputs or single elements) and dry run your loops on paper!" 
    });
  }
});

export default router;

