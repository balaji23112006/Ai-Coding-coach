import { rankProblems } from "../tools/rank-problems.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function rankProblemsNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const recommendations = await rankProblems(
      state.candidateProblems ?? [],
      state.weakTopics ?? [],
      state.mistakeAnalysis
    );
    return { recommendations };
  } catch (error) {
    console.error("[Node: rankProblems] Error:", error);
    return { recommendations: state.candidateProblems?.slice(0, 3) ?? [] };
  }
}
