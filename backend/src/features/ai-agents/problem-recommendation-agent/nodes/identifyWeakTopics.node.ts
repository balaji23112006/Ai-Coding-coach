import { identifyWeakTopics } from "../tools/identify-weak-topics.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function identifyWeakTopicsNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const weakTopics = identifyWeakTopics(
      state.profile,
      state.submissionAnalysis
    );
    return { weakTopics };
  } catch (error) {
    console.error("[Node: identifyWeakTopics] Error:", error);
    return { weakTopics: [] };
  }
}
