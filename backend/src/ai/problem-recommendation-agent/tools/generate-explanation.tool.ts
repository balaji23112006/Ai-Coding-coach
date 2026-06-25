import { recommendationExplanationService } from "../services/RecommendationExplanationService.js";
import { CandidateProblem } from "../types/recommendation-state.js";
import { MistakeAnalysis } from "../types/mistake-analysis.types.js";

export async function generateExplanation(
  weakTopics: string[],
  difficulty: string,
  recommendations: CandidateProblem[],
  mistakeAnalysis?: MistakeAnalysis
) {
  const problem = recommendations[0];

  if (!problem) {
    return "No suitable recommendation found.";
  }

  try {
    return await recommendationExplanationService.generateRecommendationExplanation({
      weakTopics,
      difficulty,
      recommendationTitle: problem.title,
      mistakeAnalysis,
    });
  } catch (error) {
    let fallback = `Based on your recent performance, we recommend tackling "${problem.title}". `;
    if (mistakeAnalysis?.primaryMistake && mistakeAnalysis.primaryMistake !== "None") {
      fallback += `This will help you practice and improve on your recent issues with ${mistakeAnalysis.primaryMistake}.`;
    } else if (weakTopics.length > 0) {
      fallback += `This will help strengthen your skills in ${weakTopics[0]}.`;
    } else {
      fallback += `This is a good problem to continue your practice.`;
    }
    return fallback;
  }
}