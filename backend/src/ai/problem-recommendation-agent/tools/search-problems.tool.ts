import { problemRepository } from "../../../features/problems/repository/problem.repository.js";
import { RECOMMENDATION_CONFIG } from "../config.js";
import { CandidateProblem, ExtendedSubmission } from "../types/recommendation-state.js";

export async function searchProblems(
  topics: string[],
  difficulty: string,
  submissions: ExtendedSubmission[]
): Promise<CandidateProblem[]> {
  const solvedProblemSlugs = new Set(
    submissions
      .filter((sub) => sub.status === "ACCEPTED" && sub.question)
      .map((sub) => sub.question?.slug)
  );

  const capitalizedDifficulty = difficulty
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
    : "Easy";

  const selectedTopic = topics.length > 0 ? topics[0] : RECOMMENDATION_CONFIG.FALLBACK_TOPIC;

  // Helper to query and filter
  const fetchAndFilter = async (queryTopic?: string, queryDiff?: string) => {
    const { items } = (await problemRepository.findMany({
      page: 1,
      pageSize: RECOMMENDATION_CONFIG.SEARCH_PAGE_SIZE * 5, // Fetch extra for filtering
      topic: queryTopic,
      difficulty: queryDiff as 'Easy' | 'Medium' | 'Hard',
    })) as { items: any[] };

    return items
      .filter((problem) => !solvedProblemSlugs.has(problem.slug))
      .slice(0, RECOMMENDATION_CONFIG.SEARCH_PAGE_SIZE);
  };

  // Attempt 1: Strict Match (Topic + Difficulty)
  let unsolvedItems = await fetchAndFilter(selectedTopic, capitalizedDifficulty);

  // Attempt 2: Same Topic, ANY Difficulty (If they ran out of target difficulty for this topic)
  if (unsolvedItems.length === 0) {
    unsolvedItems = await fetchAndFilter(selectedTopic, undefined);
  }

  // Attempt 3: Second Weak Topic + Target Difficulty (If they solved all problems in first topic)
  if (unsolvedItems.length === 0 && topics.length > 1) {
    unsolvedItems = await fetchAndFilter(topics[1], capitalizedDifficulty);
  }

  // Attempt 4: ANY Topic, Target Difficulty
  if (unsolvedItems.length === 0) {
    unsolvedItems = await fetchAndFilter(undefined, capitalizedDifficulty);
  }

  // Attempt 5: Absolute Fallback (ANY Unsolved Problem in the DB)
  if (unsolvedItems.length === 0) {
    unsolvedItems = await fetchAndFilter(undefined, undefined);
  }

  return unsolvedItems.map((problem) => ({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    description: problem.description,
    constraints: problem.constraints,
    starter_code: problem.starterCode,
    topics: problem.topics.map((item: any) => item.topic.name),
  }));
}