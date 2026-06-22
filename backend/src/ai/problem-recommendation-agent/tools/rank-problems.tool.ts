export async function rankProblems(
  candidateProblems: any[],
  weakTopics: string[]
) {
  return candidateProblems
    .map((problem) => {
      let score = 50;

      if (
        problem.topics?.includes(
          weakTopics[0]
        )
      ) {
        score += 50;
      }

      return {
        ...problem,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}