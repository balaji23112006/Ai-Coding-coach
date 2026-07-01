import { determineDifficulty } from "../tools/determine-difficulty.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function determineDifficultyNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const difficulty = determineDifficulty(
      state.profile,
      state.submissionAnalysis
    );
    return { difficulty };
  } catch (error) {
    console.error("[Node: determineDifficulty] Error:", error);
    return { difficulty: "Easy" };
  }
}
