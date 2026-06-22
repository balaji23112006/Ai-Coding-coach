// generateExplanation node
import { generateExplanation } from "../tools/generate-explanation.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function generateExplanationNode(
  state: typeof ProblemRecommendationState.State
) {
  const explanation =
    await generateExplanation(
      state.weakTopics ?? [],
      state.difficulty ?? "Easy",
      state.recommendations ?? []
    );

  return {
    explanation,
  };
}