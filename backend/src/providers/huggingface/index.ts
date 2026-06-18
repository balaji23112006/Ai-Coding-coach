/**
 * Hugging Face Inference Provider — FREE fallback LLM
 *
 * Uses the Hugging Face Inference API (no billing required).
 * Get a FREE token at: https://huggingface.co/settings/tokens
 *
 * Model used: mistralai/Mistral-7B-Instruct-v0.2
 * Free limits: unlimited for public models with rate throttling.
 */

import dotenv from 'dotenv';
import { logger } from '../../shared/utils/logger.js';

dotenv.config();

const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

// Best free instruction-following models on HuggingFace
const HF_MODEL_CANDIDATES = [
  'mistralai/Mistral-7B-Instruct-v0.2',
  'HuggingFaceH4/zephyr-7b-beta',
  'microsoft/Phi-3-mini-4k-instruct',
];

/**
 * Returns true when a Hugging Face token is configured.
 */
export function isHuggingFaceConfigured(): boolean {
  return HF_API_TOKEN.startsWith('hf_');
}

/**
 * Calls the HuggingFace Inference API (completely free).
 * Falls through multiple model candidates until one succeeds.
 */
export async function huggingFaceChat(params: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  if (!isHuggingFaceConfigured()) {
    throw new Error('HUGGINGFACE_API_TOKEN is not configured (must start with hf_)');
  }

  const combinedPrompt = `<s>[INST] <<SYS>>\n${params.systemPrompt}\n<</SYS>>\n\n${params.userMessage} [/INST]`;

  for (const model of HF_MODEL_CANDIDATES) {
    try {
      logger.info(`[HuggingFace] Trying model: ${model}`);

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: combinedPrompt,
            parameters: {
              max_new_tokens: params.maxTokens ?? 400,
              temperature: 0.3,
              do_sample: true,
              return_full_text: false,
            },
          }),
        }
      );

      if (response.status === 503) {
        // Model is loading — skip to next candidate
        logger.warn(`[HuggingFace] Model ${model} is loading, trying next...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(`[HuggingFace] ${model} returned ${response.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const data = (await response.json()) as any;

      // HF returns an array of generated texts
      const text: string =
        Array.isArray(data)
          ? data[0]?.generated_text || ''
          : data?.generated_text || '';

      if (text.trim()) {
        logger.info(`[HuggingFace] Got response from ${model} (${text.length} chars)`);
        return text.trim();
      }
    } catch (e) {
      logger.warn(`[HuggingFace] ${model} error: ${e}`);
      continue;
    }
  }

  throw new Error('All HuggingFace model candidates failed or returned empty responses');
}
