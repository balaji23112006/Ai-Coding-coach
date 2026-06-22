import { submissionRepository }
from "../../../features/submissions/repository/submission.repository.js";

export async function getSubmissionHistory(
  userId: string
) {
  return submissionRepository.findByUserId(
    userId
  );
}