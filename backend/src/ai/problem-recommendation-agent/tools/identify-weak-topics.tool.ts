export async function identifyWeakTopics(
  profile: any,
  submissionAnalysis: any
) {
  const weakTopics: string[] = [];

  if (profile?.recommendedFocus) {
    weakTopics.push(profile.recommendedFocus);
  }

  if (
  submissionAnalysis?.activityLevel ===
  "Low"
) {
  weakTopics.push("Arrays");
}

  return weakTopics.length > 0
    ? weakTopics
    : ["Arrays"];
}