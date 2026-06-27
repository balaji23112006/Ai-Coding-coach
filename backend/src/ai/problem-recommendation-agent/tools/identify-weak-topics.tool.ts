import { UserProfile } from "@prisma/client";
import { SubmissionAnalysis, ExtendedSubmission } from "../types/recommendation-state.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export function identifyWeakTopics(
  profile: UserProfile | null | undefined,
  submissionAnalysis: SubmissionAnalysis | undefined
) {
  const weakTopics: string[] = [];

  // 1. Prioritize actual skill proficiencies from the database
  if (profile?.skills && typeof profile.skills === 'object') {
    const skills = profile.skills as Record<string, number>;
    
    // Sort skills from lowest to highest score
    const sortedSkills = Object.entries(skills).sort((a, b) => a[1] - b[1]);
    
    // Grab the lowest 2 topics that have a score below 75
    const weakestFromProfile = sortedSkills
      .filter(([_, score]) => score < 75)
      .slice(0, 2)
      .map(([topic]) => topic);

    weakTopics.push(...weakestFromProfile);
  }

  // 2. If the user has no defined weak skills yet (e.g. all >75 or new user), 
  // fall back to the topics they've recently failed.
  if (weakTopics.length === 0) {
    const submissions = submissionAnalysis?.recentActivity || [];
    const failedSubmissions = submissions.filter(
      (submission: ExtendedSubmission) => submission.status !== "ACCEPTED"
    );

    if (failedSubmissions.length > 0) {
      const latestFailed = failedSubmissions[0];
      if (latestFailed.question?.topics && latestFailed.question.topics.length > 0) {
        const topics = latestFailed.question.topics
          .map((qt) => qt.topic?.name)
          .filter(Boolean) as string[];
        weakTopics.push(...topics);
      }
    }
  }

  // 3. Fallback to the profile's global recommended focus if it exists
  if (weakTopics.length === 0 && profile?.recommendedFocus) {
    weakTopics.push(profile.recommendedFocus);
  }

  // 4. Absolute fallback
  if (weakTopics.length === 0) {
    weakTopics.push(RECOMMENDATION_CONFIG.FALLBACK_TOPIC);
  }

  return [...new Set(weakTopics)];
}