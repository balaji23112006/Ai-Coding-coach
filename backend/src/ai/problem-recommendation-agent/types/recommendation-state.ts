import { UserProfile, Submission, Question, Topic } from "@prisma/client";
import { MistakeAnalysis } from "./mistake-analysis.types.js";

export interface ExtendedSubmission extends Submission {
  question?: (Question & {
    topics?: Array<{
      topic?: Topic;
    }>;
  }) | null;
}

export interface SubmissionAnalysis {
  totalSubmissions: number;
  recentActivity: ExtendedSubmission[];
  activityLevel: "Low" | "Medium" | "High";
}

export interface CandidateProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  description: string;
  constraints: unknown;
  starter_code: string;
  topics: string[];
  score?: number;
}
