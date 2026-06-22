import { getSubmissionHistory } from "../tools/get-submission-history.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function getSubmissionsNode(
  state: typeof ProblemRecommendationState.State
) {
  const submissions =
    await getSubmissionHistory(
      state.userId
    );

  return {
    submissions,
  };
}