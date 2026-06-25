/**
 * Groq Provider – Mentor Agent Chat
 *
 * Uses Groq's FREE tier with Llama 3.3 70B Versatile.
 * Get a free API key at: https://console.groq.com
 *
 * Free limits (as of 2025):
 *   - 14,400 requests / day
 *   - 500,000 tokens  / day
 *   - 6,000  tokens  / minute
 */

import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { logger } from '../../shared/utils/logger.js';
import { traceLLMCall } from '../../observability/langfuse.js';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Groq SDK client (used by the legacy /chat route too)
export const groq = new Groq({
  apiKey: GROQ_API_KEY || 'mock_key_val',
});

/**
 * Returns true when a real Groq API key is configured.
 */
export function isGroqConfigured(): boolean {
  return (
    GROQ_API_KEY.startsWith('gsk_') &&
    GROQ_API_KEY !== 'gsk_your_groq_api_key_here' &&
    GROQ_API_KEY !== 'gsk_your_key_here'
  );
}

/**
 * Primary FREE LLM call for the Mentor Agent.
 * Uses Llama 3.3 70B on Groq — completely free tier.
 */
export async function groqChat(params: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
}): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not configured (must start with gsk_)');
  }

  const fallbackModels = [
    'llama-3.3-70b-versatile',
    'qwen-2.5-32b',
    'mixtral-8x7b-32768',
    'llama-3.1-8b-instant',
  ];

  let lastError: any;

  for (const model of fallbackModels) {
    try {
      logger.info(`[Groq] Calling ${model} (temp=${params.temperature ?? 0.3})`);

      const result = await traceLLMCall<string>({
        traceName: 'mentor-agent.groq',
        generationName: 'groq-chat-completion',
        provider: 'groq',
        model,
        userId: params.userId,
        sessionId: params.sessionId,
        input: {
          systemPrompt: params.systemPrompt,
          userMessage: params.userMessage,
        },
        modelParameters: {
          temperature: params.temperature ?? 0.3,
          maxTokens: params.maxTokens ?? 400,
        },
        call: async () => {
          const response = await groq.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: params.userMessage },
            ],
            temperature: params.temperature ?? 0.3,
            max_tokens: params.maxTokens ?? 400,
          });

          const text = response.choices[0]?.message?.content || '';
          logger.info(`[Groq] Response received (${text.length} chars) from ${model}`);

          return {
            output: text,
            raw: {
              id: response.id,
              created: response.created,
              usage: response.usage,
            },
            usage: response.usage
              ? {
                  input: response.usage.prompt_tokens,
                  output: response.usage.completion_tokens,
                  total: response.usage.total_tokens,
                }
              : undefined,
          };
        },
      });

      return result; // Return immediately on first success
    } catch (error: any) {
      logger.warn(`[Groq] Model ${model} failed: ${error.message}. Attempting fallback...`);
      lastError = error;
    }
  }

  logger.error(`[Groq] All fallback models failed. Last error: ${lastError?.message}`);
  throw new Error(`All Groq fallback models failed. Last error: ${lastError?.message}`);
}
