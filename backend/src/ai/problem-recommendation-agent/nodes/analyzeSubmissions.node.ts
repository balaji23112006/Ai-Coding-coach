// analyzeSubmissions node
import { analyzeSubmissions } from "../tools/analyze-submissions.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function analyzeSubmissionsNode(
  state: typeof ProblemRecommendationState.State
) {
  const submissionAnalysis =
    await analyzeSubmissions(
      state.submissions ?? []
    );

  return {
    submissionAnalysis,
  };
}