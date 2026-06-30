import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { traceLLMCall } from '../../observability/langfuse.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';

// Detect if this is an OAuth/Bearer token (starts with ya29.) vs a standard API key
const isOAuthToken = apiKey.startsWith('ya29.');

// Standard SDK client (for AIza... keys)
export const genAI = new GoogleGenerativeAI(apiKey);

export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

// Model candidates to try in order
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
  'gemini-1.0-pro',
];

function isNotFoundError(e: any): boolean {
  const msg = e?.message || String(e);
  return msg.includes('404') || msg.includes('not found') || msg.includes('Not Found');
}

/**
 * Calls Gemini using direct REST API with Authorization: Bearer for OAuth tokens,
 * or uses the SDK for standard AIza API keys.
 * Tries multiple model names until one succeeds.
 */
export async function geminiChat(params: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
  traceId?: string;
}): Promise<string> {
  if (isOAuthToken) {
    // Use REST API directly with Bearer token (for AQ. / ya29. OAuth tokens)
    for (const modelName of MODEL_CANDIDATES) {
      try {
        return await traceLLMCall<string>({
          traceName: 'mentor-agent.gemini',
          generationName: 'gemini-generate-content',
          provider: 'gemini',
          model: modelName,
          userId: params.userId,
          sessionId: params.sessionId,
          traceId: params.traceId,
          input: {
            systemPrompt: params.systemPrompt,
            userMessage: params.userMessage,
          },
          modelParameters: {
            temperature: params.temperature ?? 0.3,
            maxOutputTokens: params.maxTokens ?? 400,
          },
          call: async () => {
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: params.systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: params.userMessage }] }],
                generationConfig: {
                  temperature: params.temperature ?? 0.3,
                  maxOutputTokens: params.maxTokens ?? 400,
                },
              }),
            });

            if (response.status === 404) throw new Error('MODEL_NOT_FOUND');

            if (!response.ok) {
              const errText = await response.text();
              if (errText.includes('not found') || errText.includes('PERMISSION_DENIED')) {
                throw new Error('MODEL_NOT_FOUND');
              }
              throw new Error(`Gemini API ${response.status}: ${errText}`);
            }

            const data = (await response.json()) as any;
            return {
              output: data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
              raw: {
                usageMetadata: data?.usageMetadata,
                finishReason: data?.candidates?.[0]?.finishReason,
              },
              usage: data?.usageMetadata
                ? {
                    input: data.usageMetadata.promptTokenCount,
                    output: data.usageMetadata.candidatesTokenCount,
                    total: data.usageMetadata.totalTokenCount,
                  }
                : undefined,
            };
          },
        });
      } catch (e: any) {
        if (e?.message === 'MODEL_NOT_FOUND') continue;
        if (isNotFoundError(e)) continue;
        throw e;
      }
    }
    throw new Error('No Gemini model available for this OAuth token');
  }

  // Standard SDK path for AIza... API keys
  for (const modelName of MODEL_CANDIDATES) {
    try {
      return await traceLLMCall<string>({
        traceName: 'mentor-agent.gemini',
        generationName: 'gemini-generate-content',
        provider: 'gemini',
        model: modelName,
        userId: params.userId,
        sessionId: params.sessionId,
        traceId: params.traceId,
        input: {
          systemPrompt: params.systemPrompt,
          userMessage: params.userMessage,
        },
        modelParameters: {
          temperature: params.temperature ?? 0.3,
          maxOutputTokens: params.maxTokens ?? 400,
        },
        call: async () => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: params.temperature ?? 0.3,
              maxOutputTokens: params.maxTokens ?? 400,
            },
            systemInstruction: params.systemPrompt,
          });

          const result = await model.generateContent(params.userMessage);
          const response = result.response as any;
          return {
            output: result.response.text(),
            raw: {
              usageMetadata: response?.usageMetadata,
              finishReason: response?.candidates?.[0]?.finishReason,
            },
            usage: response?.usageMetadata
              ? {
                  input: response.usageMetadata.promptTokenCount,
                  output: response.usageMetadata.candidatesTokenCount,
                  total: response.usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        },
      });
    } catch (e: any) {
      if (isNotFoundError(e)) continue;
      throw e;
    }
  }

  throw new Error('No Gemini model available for this API key');
}
