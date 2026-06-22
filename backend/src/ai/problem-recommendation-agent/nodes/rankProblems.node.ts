// rankProblems node
import { rankProblems } from "../tools/rank-problems.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function rankProblemsNode(
  state: typeof ProblemRecommendationState.State
) {
  const recommendations =
    await rankProblems(
      state.candidateProblems ?? [],
      state.weakTopics ?? []
    );

  return {
    recommendations,
  };
}