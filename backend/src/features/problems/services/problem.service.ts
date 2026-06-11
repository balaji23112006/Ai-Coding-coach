import { problemRepository } from '../repository/problem.repository.js';
import { GetQuestionsQuery } from '../schemas/problem.schema.js';
import { NotFoundError } from '../../../shared/errors/custom.errors.js';

const parseConstraints = (constraintsStr: string): string[] => {
  try {
    const parsed = JSON.parse(constraintsStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [constraintsStr];
  } catch {
    return constraintsStr ? [constraintsStr] : [];
  }
};

export class ProblemService {
  async getQuestions(filters: GetQuestionsQuery) {
    const { items, total } = await problemRepository.findMany(filters);

    const formattedItems = items.map((q) => ({
      id: q.id,
      slug: q.slug,
      title: q.title,
      difficulty: q.difficulty,
      description: q.description,
      constraints: parseConstraints(q.constraints),
      starter_code: q.starterCode,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      topics: q.topics.map((qt) => qt.topic.name),
    }));

    return {
      items: formattedItems,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getQuestionBySlug(slug: string) {
    const question = await problemRepository.findBySlug(slug);

    if (!question) {
      throw new NotFoundError(`Question with slug "${slug}" not found`);
    }

    return {
      id: question.id,
      slug: question.slug,
      title: question.title,
      difficulty: question.difficulty,
      description: question.description,
      constraints: parseConstraints(question.constraints),
      starter_code: question.starterCode,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      topics: question.topics.map((qt) => qt.topic.name),
      test_cases: question.testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expected_output: tc.expectedOutput,
        is_hidden: tc.isHidden,
      })),
    };
  }

  async getTopics() {
    const topics = await problemRepository.findAllTopics();
    return topics.map((t) => ({
      id: t.id,
      name: t.name,
    }));
  }
}

export const problemService = new ProblemService();
