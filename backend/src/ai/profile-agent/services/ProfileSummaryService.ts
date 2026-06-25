import dotenv from 'dotenv';
dotenv.config();
import { agentLogger } from './AgentLogger.js';
import { langfuse } from '../../../providers/langfuse/index.js';

/**
 * Service to interact with Gemini API (gemini-2.5-flash)
 * for generating user profile summaries and explaining learning trends.
 */
export class ProfileSummaryService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.baseUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Private helper to execute a fetch request to the Gemini API endpoint.
   * @param prompt The string prompt to send to the model.
   * @param traceId Optional trace ID to log the LLM generation.
   * @param promptType The category or name of this LLM task.
   */
  private async callGemini(
    prompt: string,
    traceId?: string,
    promptType: string = 'gemini-llm-call',
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }

    let generation: any = null;
    if (traceId) {
      try {
        const trace = langfuse.trace({ id: traceId });
        generation = trace.generation({
          name: promptType,
          model: 'gemini-2.5-flash',
          input: prompt,
          startTime: new Date(),
        });
      } catch (err) {
        console.error('[ProfileSummaryService] Error creating Langfuse generation:', err);
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as any;
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('Invalid response structure from Gemini API');
      }

      const responseText = generatedText.trim();

      if (generation) {
        try {
          const usageMetadata = data.usageMetadata;
          generation.end({
            output: responseText,
            endTime: new Date(),
            usage: {
              promptTokens: usageMetadata?.promptTokenCount || 0,
              completionTokens: usageMetadata?.candidatesTokenCount || 0,
              totalTokens: usageMetadata?.totalTokenCount || 0,
            },
          });
          await langfuse.flushAsync();
        } catch (err) {
          console.error('[ProfileSummaryService] Error ending Langfuse generation:', err);
        }
      }

      return responseText;
    } catch (error) {
      if (generation) {
        try {
          generation.end({
            output: error instanceof Error ? error.message : String(error),
            endTime: new Date(),
            level: 'ERROR',
            statusMessage: error instanceof Error ? error.message : String(error),
          });
          await langfuse.flushAsync();
        } catch (err) {
          console.error('[ProfileSummaryService] Error ending Langfuse generation on error:', err);
        }
      }
      console.error('[ProfileSummaryService] Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * Generates a supportive, professional paragraph summary of the user's coding profile.
   * @param params Inputs containing level, mastery ratings, strong and weak areas.
   */
  async generateProfileSummary(params: {
    level: string;
    mastery: Record<string, number>;
    strongAreas: string[];
    weakAreas: string[];
    traceId?: string;
  }): Promise<string> {
    const { level, mastery, strongAreas, weakAreas, traceId } = params;
    const prompt = `
You are an expert AI Coding Coach. Analyze the following student progress data:
- Skill Level: ${level}
- Strengths: ${strongAreas.join(', ') || 'None identified yet'}
- Areas for Improvement: ${weakAreas.join(', ') || 'None identified yet'}
- Topic Mastery Scores: ${JSON.stringify(mastery)}

Based ONLY on this data, write a structured, encouraging profile summary.
Provide your assessment as a list of bullet points starting with the '•' character. Each point should cover a specific aspect:
• STANDING: Summarize their current standing based on their skill level.
• KEY STRENGTHS: Highlight what they are doing well based on their strengths.
• AREAS TO IMPROVE: Recommend what they should improve based on their weak areas.
• RECOMMENDED FOCUS: Suggest what topics they should focus on next.
Do NOT use markdown headers or markdown bullets. Just use the '•' character at the start of each line.
`;

    try {
      const response = await this.callGemini(prompt, traceId, 'generate-profile-summary');
      if (traceId) {
        agentLogger.logPrompt(traceId, 'profile_summary', prompt, response);
      }
      return response;
    } catch (err) {
      console.error('[ProfileSummaryService] generateProfileSummary failed:', err);
      throw err;
    }
  }

  /**
   * Generates an explanation of the user's recent coding trends and velocity.
   * @param params Inputs containing the trends array and recent activity attempt count.
   */
  async generateTrendExplanation(params: {
    trends: string[];
    recentActivityCount: number;
    traceId?: string;
  }): Promise<string> {
    const { trends, recentActivityCount, traceId } = params;
    const prompt = `
You are an expert AI Coding Coach. Analyze the following student activity trends:
- Recent Activity Count: ${recentActivityCount} submission attempts recently
- Detected Trends:
${trends.map((t) => `  * ${t}`).join('\n') || '  * No significant trends detected yet.'}

Based ONLY on these trends, write a brief, coaching-focused explanation.
Provide your analysis as a list of bullet points starting with the '•' character. Each point should cover:
• LEARNING ACTIVITY: Explain what their activity volume says about their velocity.
• CURRENT TRENDS: Highlight any patterns in their recent coding submissions.
• MOMENTUM ADVICE: Provide actionable advice on how to improve their momentum.
Do NOT use markdown headers or markdown bullets. Just use the '•' character at the start of each line.
`;

    try {
      const response = await this.callGemini(prompt, traceId, 'generate-trend-explanation');
      if (traceId) {
        agentLogger.logPrompt(traceId, 'trend_explanation', prompt, response);
      }
      return response;
    } catch (err) {
      console.error('[ProfileSummaryService] generateTrendExplanation failed:', err);
      throw err;
    }
  }
}

export const profileSummaryService = new ProfileSummaryService();
