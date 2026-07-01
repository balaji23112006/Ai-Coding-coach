import { generateRoadmapTool } from "../tools/generate-roadmap.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function generateRoadmapNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    if (!state.recommendations || state.recommendations.length === 0) {
      return {
        roadmap: "### 🎉 All Mastered\nYou have solved every available problem. Great job!",
      };
    }

    const problemTitle = state.recommendations[0].title;
    
    const roadmap = await generateRoadmapTool(
      state.weakTopics ?? [],
      state.difficulty ?? "Easy",
      problemTitle,
      state.mistakeAnalysis,
      state.profile?.skills
    );
    
    return { roadmap };
  } catch (error) {
    console.error("[Node: generateRoadmap] Error:", error);
    return {
      roadmap: "### 🎯 Keep Practicing\n- We recommend trying the suggested problem to continue your learning journey.",
    };
  }
}
