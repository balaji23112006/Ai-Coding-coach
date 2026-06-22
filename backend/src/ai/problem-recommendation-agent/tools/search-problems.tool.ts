import { problemRepository } from "../../../features/problems/repository/problem.repository.js";

type SearchProblemItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  description: string;
  constraints: unknown;
  starterCode: string;
  topics: Array<{ topic: { name: string } }>;
};
export async function searchProblems({
  topics,
  difficulty,
}: {
  topics: string[];
  difficulty: string;
}) {
  const { items } = (await problemRepository.findMany({
    page: 1,
    pageSize: 10,
    topic: topics[0],
    difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
  })) as { items: SearchProblemItem[] };

  return items.map((problem) => ({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    description: problem.description,
    constraints: problem.constraints,
    starter_code: problem.starterCode,
    topics: problem.topics.map((item) => item.topic.name),
  }));
}