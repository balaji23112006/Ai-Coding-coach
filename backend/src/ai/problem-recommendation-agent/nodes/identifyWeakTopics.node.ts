// identifyWeakTopics node
import { identifyWeakTopics } from "../tools/identify-weak-topics.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function identifyWeakTopicsNode(
  state: typeof ProblemRecommendationState.State
) {
  const weakTopics =
    await identifyWeakTopics(
      state.profile,
      state.submissionAnalysis
    );

  return {
    weakTopics,
  };
}