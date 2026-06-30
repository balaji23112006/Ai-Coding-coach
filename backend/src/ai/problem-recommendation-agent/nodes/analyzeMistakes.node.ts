import { analyzeMistakePatterns } from "../tools/analyze-mistake-patterns.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function analyzeMistakesNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const mistakeAnalysis = await analyzeMistakePatterns(state.submissions ?? []);
    return { mistakeAnalysis };
  } catch (error) {
    console.error("[Node: analyzeMistakes] Error:", error);
    return { mistakeAnalysis: undefined };
  }
}
