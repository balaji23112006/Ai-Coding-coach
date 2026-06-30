import { groqChat } from "../../../providers/groq/index.js";
import { MistakeAnalysis } from "../types/mistake-analysis.types.js";
import { RECOMMENDATION_CONFIG } from "../config.js";
import { agentLogger } from "../../../ai/profile-agent/services/AgentLogger.js";

export async function generateRoadmapTool(
  weakTopics: string[],
  difficulty: string,
  recommendationTitle: string,
  mistakeAnalysis?: MistakeAnalysis,
  skills?: any,
  traceId?: string
): Promise<string> {
  const primaryMistake = mistakeAnalysis?.primaryMistake || "None";
  const evidence = mistakeAnalysis?.evidence?.join(", ") || "";

  const weakTopic =
    weakTopics && weakTopics.length > 0
      ? weakTopics[0]
      : RECOMMENDATION_CONFIG.FALLBACK_TOPIC;

  const allWeakTopics =
    weakTopics && weakTopics.length > 0
      ? weakTopics.join(", ")
      : weakTopic;
      
  const skillsContext = skills ? JSON.stringify(skills) : "No specific skill data provided.";

  const prompt = `
You are an expert AI Coding Coach generating a personalized learning roadmap for a student.

Student's Analysis:
- Weak Topics: ${allWeakTopics}
- Primary Mistake Pattern: ${primaryMistake} ${evidence ? `(Evidence: ${evidence})` : ""}
- Current Target Difficulty: ${difficulty}
- Recommended Next Problem: ${recommendationTitle}
- Skill Breakdown: ${skillsContext}

Generate a personalized learning roadmap. Follow these STRICT rules:
1. Output ONLY valid RAW JSON. Do NOT output markdown backticks (like \`\`\`json).
2. The JSON must be an array of exactly 3 phase objects.
3. Phase 1 MUST feature the recommended problem: "${recommendationTitle}".
4. Each phase must directly address the student's weak topics and mistake patterns.

Output JSON format exactly like this:
[
  {
    "phaseNumber": 1,
    "emoji": "🎯",
    "title": "Building Foundations",
    "context": "One sentence of context explaining why this phase is important.",
    "problemName": "Problem Title Here",
    "difficulty": "Medium",
    "focus": "What specific skill to focus on",
    "review": "What edge cases or concepts to review"
  },
  {
    "phaseNumber": 2,
    "emoji": "📈",
    "title": "Enhancing Skills",
    "context": "...",
    "problemName": "...",
    "difficulty": "...",
    "focus": "...",
    "review": "..."
  },
  {
    "phaseNumber": 3,
    "emoji": "🚀",
    "title": "Mastering Advanced Concepts",
    "context": "...",
    "problemName": "...",
    "difficulty": "...",
    "focus": "...",
    "review": "..."
  }
]
`;

  try {
    const response = await groqChat({
      systemPrompt:
        "You are an expert AI Coding Coach. Generate personalized learning roadmaps. Output ONLY raw JSON array, nothing else.",
      userMessage: prompt,
      temperature: 0.2,
      maxTokens: 800,
    });
    
    if (traceId) {
      agentLogger.logPrompt(
        traceId,
        "groq",
        `[SYSTEM PROMPT]:\nYou are an expert AI Coding Coach. Generate personalized, Markdown-formatted learning roadmaps.\n\n[USER MESSAGE]:\n${prompt}`,
        response
      );
      agentLogger.logDecision(traceId, `Successfully generated roadmap using Groq LLM.`);
    }

    return response;
  } catch (error) {
    console.error("[generateRoadmapTool] LLM failed:", error);
    const groqErrorMsg = error instanceof Error ? error.message : String(error);

    if (traceId) {
      agentLogger.logDecision(traceId, `Groq LLM call failed for roadmap generation: ${groqErrorMsg}`);
    }

    // Fallback: return a basic JSON roadmap
    return JSON.stringify([
      {
        phaseNumber: 1,
        emoji: "🎯",
        title: "Tackle Your Weak Area",
        context: `Your focus topic is ${weakTopic}. Start by solving the recommended problem.`,
        problemName: recommendationTitle,
        difficulty,
        focus: "Understanding the core algorithm pattern",
        review: "Basic edge cases"
      },
      {
        phaseNumber: 2,
        emoji: "📈",
        title: "Reinforce the Fundamentals",
        context: `Build confidence by revisiting similar problems in ${weakTopic}.`,
        problemName: "Similar Problem",
        difficulty: "Medium",
        focus: "Identifying the pattern quickly",
        review: primaryMistake !== "None" ? primaryMistake : "Time complexity"
      },
      {
        phaseNumber: 3,
        emoji: "🚀",
        title: "Push to the Next Level",
        context: "Once comfortable, attempt harder variations.",
        problemName: "Advanced Problem",
        difficulty: "Hard",
        focus: "Optimizing for space and time",
        review: "Complex edge cases"
      }
    ]);
  }
}
