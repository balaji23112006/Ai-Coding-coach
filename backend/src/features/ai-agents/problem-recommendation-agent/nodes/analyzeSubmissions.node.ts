import { analyzeSubmissions } from "../tools/analyze-submissions.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function analyzeSubmissionsNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const submissionAnalysis = analyzeSubmissions(state.submissions ?? []);
    return { submissionAnalysis };
  } catch (error) {
    console.error("[Node: analyzeSubmissions] Error:", error);
    return { submissionAnalysis: undefined };
  }
}
