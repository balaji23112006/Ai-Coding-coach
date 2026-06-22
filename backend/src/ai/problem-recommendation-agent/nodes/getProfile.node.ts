// getProfile node
import { getUserProfile } from "../tools/get-user-profile.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function getProfileNode(
  state: typeof ProblemRecommendationState.State
) {
  const profile = await getUserProfile(
    state.userId
  );

  return {
    profile,
  };
}