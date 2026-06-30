import { RECOMMENDATION_CONFIG } from "../config.js";
import { groqChat } from "../../../providers/groq/index.js";
import { geminiChat } from "../../../providers/google/index.js";
import { agentLogger } from "../../../ai/profile-agent/services/AgentLogger.js";

export class RecommendationExplanationService {
  async generateRecommendationExplanation(params: {
    weakTopics: string[];
    difficulty: string;
    recommendationTitle: string;
    mistakeAnalysis?: any;
    traceId?: string;
  }): Promise<string> {
    const primaryMistake = params.mistakeAnalysis?.primaryMistake || "None";
    const evidence = params.mistakeAnalysis?.evidence?.join(", ") || "";
    
    // Bounds check on weakTopics
    const weakTopic = params.weakTopics && params.weakTopics.length > 0 
      ? params.weakTopics[0] 
      : RECOMMENDATION_CONFIG.FALLBACK_TOPIC;

    const prompt = `
You are an AI Coding Coach.

Detected coding mistake pattern: ${primaryMistake} (Evidence: ${evidence})
Weak Topic: ${weakTopic}
Target Difficulty: ${params.difficulty}
Recommended Problem: ${params.recommendationTitle}

Explain why this problem was recommended and how it helps the student improve.
STRICT RULES:
1. Write EXACTLY 2 or 3 short sentences.
2. DO NOT use any markdown formatting (NO asterisks **, NO bold, NO bullet points).
3. Be direct, encouraging, and use plain text only.
`;

    try {
      const response = await groqChat({
        systemPrompt: "You are an expert AI Coding Coach generating personalized problem recommendations.",
        userMessage: prompt,
        temperature: 0.3,
        maxTokens: 150
      });

      if (params.traceId) {
        agentLogger.logPrompt(
          params.traceId,
          "groq",
          `[SYSTEM PROMPT]:\nYou are an expert AI Coding Coach generating personalized problem recommendations.\n\n[USER MESSAGE]:\n${prompt}`,
          response
        );
        agentLogger.logDecision(params.traceId, `Successfully generated recommendation explanation using Groq LLM.`);
      }

      return response;
    } catch (error) {
      console.error("[RecommendationExplanationService] Groq failed, attempting Gemini fallback:", error);
      const groqErrorMsg = error instanceof Error ? error.message : String(error);

      if (params.traceId) {
        agentLogger.logDecision(params.traceId, `Groq LLM call failed for recommendation explanation: ${groqErrorMsg}`);
      }

      try {
        const response = await geminiChat({
          systemPrompt: "You are an expert AI Coding Coach generating personalized problem recommendations.",
          userMessage: prompt,
          temperature: 0.3,
          maxTokens: 150
        });

        if (params.traceId) {
          agentLogger.logPrompt(
            params.traceId,
            "gemini",
            `[SYSTEM PROMPT]:\nYou are an expert AI Coding Coach generating personalized problem recommendations.\n\n[USER MESSAGE]:\n${prompt}`,
            response
          );
          agentLogger.logDecision(params.traceId, `Successfully generated recommendation explanation using Gemini LLM fallback.`);
        }

        return response;
      } catch (geminiError) {
        console.error("[RecommendationExplanationService] Gemini failed:", geminiError);
        const geminiErrorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);

        if (params.traceId) {
          agentLogger.logDecision(params.traceId, `Gemini LLM call failed for recommendation explanation: ${geminiErrorMsg}`);
        }

        if (params.mistakeAnalysis && params.mistakeAnalysis.primaryMistake !== "None") {
          return `We noticed several ${params.mistakeAnalysis.primaryMistake.toLowerCase()}-related issues in your recent attempts. Practicing "${params.recommendationTitle}" will help strengthen your skills in this area while reinforcing your ${weakTopic} fundamentals.`;
        }

        return `Recommended "${params.recommendationTitle}" because your focus area is ${weakTopic} and your target difficulty is ${params.difficulty}.`;
      }
    }
  }
}

export const recommendationExplanationService = new RecommendationExplanationService();