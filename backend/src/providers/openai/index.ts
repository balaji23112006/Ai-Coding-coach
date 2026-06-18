/**
 * OpenAI Provider
 *
 * Uses the OpenAI Chat Completions API (gpt-4o-mini) via native fetch.
 * No extra npm dependency required.
 */

import dotenv from 'dotenv';
import { logger } from '../../shared/utils/logger.js';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Returns true when a usable OpenAI key is configured.
 */
export function isOpenAIConfigured(): boolean {
  return OPENAI_API_KEY.startsWith('sk-');
}

/**
 * Calls the OpenAI Chat Completions endpoint.
 *
 * @param params.systemPrompt  – the system-level instruction
 * @param params.userMessage   – the user turn
 * @param params.temperature   – sampling temperature (default 0.3)
 * @param params.maxTokens     – max response tokens  (default 400)
 * @returns the assistant reply text
 */
export async function openaiChat(params: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = 'gpt-4o-mini';

  logger.info(`[OpenAI] Calling ${model} (temp=${params.temperature ?? 0.3})`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 400,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as any;
  const text: string = data?.choices?.[0]?.message?.content || '';

  logger.info(`[OpenAI] Response received (${text.length} chars)`);
  return text;
}
