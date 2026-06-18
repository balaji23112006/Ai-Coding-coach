/**
 * Hugging Face Inference Provider - free fallback LLM.
 *
 * Uses the Hugging Face Inference API and records sanitized Langfuse traces
 * around each attempted model call.
 */

import dotenv from 'dotenv';
import { logger } from '../../shared/utils/logger.js';
import { traceLLMCall } from '../../observability/langfuse.js';

dotenv.config();

const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN || '';

const HF_MODEL_CANDIDATES = [
  'mistralai/Mistral-7B-Instruct-v0.2',
  'HuggingFaceH4/zephyr-7b-beta',
  'microsoft/Phi-3-mini-4k-instruct',
];

export function isHuggingFaceConfigured(): boolean {
  return HF_API_TOKEN.startsWith('hf_');
}

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

      const text = await traceLLMCall<string>({
        traceName: 'mentor-agent.huggingface',
        generationName: 'huggingface-inference',
        provider: 'huggingface',
        model,
        input: {
          systemPrompt: params.systemPrompt,
          userMessage: params.userMessage,
        },
        modelParameters: {
          maxNewTokens: params.maxTokens ?? 400,
          temperature: 0.3,
          doSample: true,
        },
        call: async () => {
          const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
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
          });

          if (response.status === 503) {
            throw new Error('MODEL_LOADING');
          }

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HuggingFace ${model} returned ${response.status}: ${errText.slice(0, 200)}`);
          }

          const data = (await response.json()) as any;
          const generatedText: string = Array.isArray(data)
            ? data[0]?.generated_text || ''
            : data?.generated_text || '';

          return {
            output: generatedText,
            raw: {
              responseShape: Array.isArray(data) ? 'array' : typeof data,
            },
          };
        },
      });

      if (text.trim()) {
        logger.info(`[HuggingFace] Got response from ${model} (${text.length} chars)`);
        return text.trim();
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'MODEL_LOADING') {
        logger.warn(`[HuggingFace] Model ${model} is loading, trying next...`);
        continue;
      }
      logger.warn(`[HuggingFace] ${model} error: ${e}`);
      continue;
    }
  }

  throw new Error('All HuggingFace model candidates failed or returned empty responses');
}
