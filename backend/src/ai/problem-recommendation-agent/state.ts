import { Annotation } from "@langchain/langgraph";
import { UserProfile } from "@prisma/client";
import {
  ExtendedSubmission,
  SubmissionAnalysis,
  CandidateProblem,
} from "./types/recommendation-state.js";
import { MistakeAnalysis } from "./types/mistake-analysis.types.js";

export const ProblemRecommendationState =
  Annotation.Root({
    userId: Annotation<string>(),

    profile: Annotation<UserProfile | null>(),
    submissions: Annotation<ExtendedSubmission[]>(),

    submissionAnalysis: Annotation<SubmissionAnalysis>(),
    mistakeAnalysis: Annotation<MistakeAnalysis>(),

    weakTopics: Annotation<string[]>(),

    difficulty: Annotation<string>(),

    candidateProblems: Annotation<CandidateProblem[]>(),

    recommendations: Annotation<CandidateProblem[]>(),

    explanation: Annotation<string>(),
  });