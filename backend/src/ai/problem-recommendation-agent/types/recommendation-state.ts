export interface RecommendationState {
  userId: string;

  profile?: unknown;

  submissions?: unknown[];

  submissionAnalysis?: unknown;

  weakTopics?: string[];

  difficulty?: string;

  candidateProblems?: unknown[];

  recommendations?: unknown[];

  explanation?: string;
}