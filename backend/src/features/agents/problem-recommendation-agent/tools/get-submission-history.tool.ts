import { submissionRepository } from "../../../assessments/submissions/repository/submission.repository.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export async function getSubmissionHistory(userId: string) {
  return submissionRepository.findByUserId(
    userId,
    RECOMMENDATION_CONFIG.SUBMISSION_HISTORY_LIMIT
  );
}
