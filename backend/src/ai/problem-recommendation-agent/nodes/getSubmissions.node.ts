import { getSubmissionHistory } from "../tools/get-submission-history.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function getSubmissionsNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const submissions = await getSubmissionHistory(state.userId);
    return { submissions };
  } catch (error) {
    console.error("[Node: getSubmissions] Error:", error);
    return { submissions: [] };
  }
}
