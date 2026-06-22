import { Annotation } from "@langchain/langgraph";

export const ProblemRecommendationState =
  Annotation.Root({
    userId: Annotation<string>(),

    profile: Annotation<unknown>(),
    submissions: Annotation<unknown[]>(),

    submissionAnalysis: Annotation<unknown>(),

    weakTopics: Annotation<string[]>(),

    difficulty: Annotation<string>(),

    candidateProblems: Annotation<unknown[]>(),

    recommendations: Annotation<unknown[]>(),

    explanation: Annotation<string>(),
  });