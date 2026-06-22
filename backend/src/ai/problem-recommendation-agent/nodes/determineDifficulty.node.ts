// determineDifficulty node
import { determineDifficulty } from "../tools/determine-difficulty.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function determineDifficultyNode(
  state: typeof ProblemRecommendationState.State
) {
  const difficulty =
    await determineDifficulty(
      state.profile,
      state.submissionAnalysis
    );

  return {
    difficulty,
  };
}