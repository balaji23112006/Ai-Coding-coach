import { generateExplanation } from "../tools/generate-explanation.tool.js";
import { ProblemRecommendationState } from "../state.js";

export async function generateExplanationNode(
  state: typeof ProblemRecommendationState.State
) {
  try {
    if (!state.recommendations || state.recommendations.length === 0) {
      return {
        explanation: "Congratulations! You have solved every single problem currently available in the database. Take a break, you've earned it!",
        recommendations: [
          {
            id: "all-solved",
            slug: "all-solved",
            title: "🎉 All Problems Solved",
            difficulty: "Master",
            description: "You have solved all problems.",
            constraints: "",
            starter_code: {},
            topics: ["Mastery"],
          }
        ]
      };
    }

    const explanation = await generateExplanation(
      state.weakTopics ?? [],
      state.difficulty ?? "Easy",
      state.recommendations,
      state.mistakeAnalysis
    );
    return { explanation };
  } catch (error) {
    console.error("[Node: generateExplanation] Error:", error);
    return { explanation: "We found some recommended problems to help you practice." };
  }
}
