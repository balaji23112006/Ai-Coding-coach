import { UserProfile } from "@prisma/client";
import { SubmissionAnalysis } from "../types/recommendation-state.js";

export function determineDifficulty(
  profile: UserProfile | null | undefined,
  submissionAnalysis: SubmissionAnalysis | undefined
) {
  if (
    submissionAnalysis?.activityLevel ===
    "High"
  ) {
    return "Medium";
  }

  return (
    profile?.recommendedDifficulty ||
    "Easy"
  );
}