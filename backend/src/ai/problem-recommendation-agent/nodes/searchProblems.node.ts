// searchProblems node
import { searchProblems } from "../tools/search-problems.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function searchProblemsNode(
  state: typeof ProblemRecommendationState.State
) {

  const candidateProblems =
    await searchProblems({
      topics: state.weakTopics ?? [],
      difficulty:
        state.difficulty ?? "Easy",
    });

  return {
    candidateProblems,
  };
}