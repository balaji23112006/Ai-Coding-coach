import { ProfileAgentState } from '../state.js';

/**
 * Node: BootstrapNode
 * Initializes a clean, empty profile for new users or when insufficient data is available,
 * while still accurately reflecting any solved problem counts.
 */
export async function bootstrapNode(
  state: typeof ProfileAgentState.State,
): Promise<Partial<typeof ProfileAgentState.State>> {
  const easySolvedSet = new Set<string>();
  const mediumSolvedSet = new Set<string>();
  const hardSolvedSet = new Set<string>();
  const allSolvedSet = new Set<string>();

  const submissions = state.history?.submissions || [];
  console.log(
    `[bootstrapNode] Initializing bootstrap. Number of submissions: ${submissions.length}`,
  );

  for (const sub of submissions) {
    console.log(
      `[bootstrapNode] Submission ID: ${sub.id}, Status: ${sub.status}, Question ID: ${sub.question?.id}, Question Difficulty: ${sub.question?.difficulty}`,
    );
    if (sub.status === 'ACCEPTED' && sub.question) {
      const diff = sub.question.difficulty;
      const qId = sub.question.id;
      allSolvedSet.add(qId);
      if (diff === 'Easy') {
        easySolvedSet.add(qId);
      } else if (diff === 'Medium') {
        mediumSolvedSet.add(qId);
      } else if (diff === 'Hard') {
        hardSolvedSet.add(qId);
      }
    }
  }

  console.log(
    `[bootstrapNode] Solved count summary - Easy: ${easySolvedSet.size}, Medium: ${mediumSolvedSet.size}, Hard: ${hardSolvedSet.size}, Total: ${allSolvedSet.size}`,
  );

  return {
    level: 'Unclassified',
    confidence: 0.05,
    profileStatus: 'BOOTSTRAP',
    easySolved: easySolvedSet.size,
    mediumSolved: mediumSolvedSet.size,
    hardSolved: hardSolvedSet.size,
    solvedCount: allSolvedSet.size,
    mastery: {},
    strongAreas: [],
    weakAreas: [],
    trends: [],
    recommendedFocus: 'None',
    recommendedDifficulty: 'Easy',
  };
}
