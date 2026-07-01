import { ExtendedSubmission, SubmissionAnalysis } from "../types/recommendation-state.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export function analyzeSubmissions(
  submissions: ExtendedSubmission[] | undefined
): SubmissionAnalysis {
  const safeSubmissions = submissions || [];
  const totalSubmissions = safeSubmissions.length;

  const recentActivity = safeSubmissions.slice(0, RECOMMENDATION_CONFIG.RECENT_ACTIVITY_SLICE);

  const activityLevel =
    totalSubmissions >= RECOMMENDATION_CONFIG.HIGH_ACTIVITY_THRESHOLD
      ? "High"
      : totalSubmissions >= RECOMMENDATION_CONFIG.LOW_ACTIVITY_THRESHOLD
      ? "Medium"
      : "Low";

  return {
    totalSubmissions,
    recentActivity,
    activityLevel,
  };
}