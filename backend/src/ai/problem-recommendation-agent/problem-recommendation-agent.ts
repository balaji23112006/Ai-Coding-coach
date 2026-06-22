import { getUserProfile } from "./tools/get-user-profile.tool";
import { getSubmissionHistory } from "./tools/get-submission-history.tool";
import { identifyWeakTopics } from "./tools/identify-weak-topics.tool";
import { searchProblems } from "./tools/search-problems.tool";
import { rankProblems } from "./tools/rank-problems.tool";
import { determineDifficulty } from "./tools/determine-difficulty.tool";
import { generateExplanation } from "./tools/generate-explanation.tool";
import { analyzeSubmissions }
from "./tools/analyze-submissions.tool";
import { RecommendationState } from "./types/recommendation-state";

export async function problemRecommendationAgent(
  userId: string
) {
 const state: RecommendationState = {
  userId,
};
state.profile =
  await getUserProfile(userId);

state.submissions =
  await getSubmissionHistory(userId);

state.submissionAnalysis =
  await analyzeSubmissions(
    state.submissions
  );


  state.weakTopics =
  await identifyWeakTopics(
    state.profile,
    state.submissionAnalysis
  );

state.difficulty =
  await determineDifficulty(
    state.profile,
    state.submissionAnalysis
  );

state.candidateProblems =
  await searchProblems({
    topics: state.weakTopics,
    difficulty: state.difficulty ?? "medium",
  });

state.recommendations =
  await rankProblems(
    state.candidateProblems,
    state.weakTopics
  );

state.explanation =
  await generateExplanation(
    state.weakTopics,
    state.difficulty ?? "medium",
    state.recommendations
  );

return state;
}