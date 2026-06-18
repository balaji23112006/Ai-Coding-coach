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
  return GROQ_API_KEY.startsWith('gsk_');
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
}): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not configured (must start with gsk_)');
  }

  const model = 'llama-3.3-70b-versatile';
  logger.info(`[Groq] Calling ${model} (temp=${params.temperature ?? 0.3})`);

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
  logger.info(`[Groq] Response received (${text.length} chars)`);
  return text;
}
