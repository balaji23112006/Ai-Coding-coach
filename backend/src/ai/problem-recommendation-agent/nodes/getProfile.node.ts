import { getUserProfile } from "../tools/get-user-profile.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function getProfileNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    const profile = await getUserProfile(state.userId);
    return { profile };
  } catch (error) {
    console.error("[Node: getProfile] Error:", error);
    return { profile: null };
  }
}
