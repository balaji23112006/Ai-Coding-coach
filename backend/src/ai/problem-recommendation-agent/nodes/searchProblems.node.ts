import { searchProblems } from "../tools/search-problems.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function searchProblemsNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const candidateProblems = await searchProblems(
      state.weakTopics ?? [],
      state.difficulty ?? "Easy",
      state.submissions ?? []
    );
    return { candidateProblems };
  } catch (error) {
    console.error("[Node: searchProblems] Error:", error);
    return { candidateProblems: [] };
  }
}
