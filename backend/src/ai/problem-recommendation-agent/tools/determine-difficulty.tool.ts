export async function determineDifficulty(
  profile: any,
  submissionAnalysis: any
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