import { problemRepository } from '../repository/problem.repository.js';
import { GetQuestionsQuery } from '../schemas/problem.schema.js';
import { NotFoundError } from '../../../shared/errors/custom.errors.js';
import { prisma } from '../../../database/prisma.js';

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

    const questionIds = items.map((q) => q.id);
    const submissions = await prisma.submission.findMany({
      where: {
        questionId: { in: questionIds },
      },
      select: {
        id: true,
        questionId: true,
        userId: true,
        status: true,
      },
    });

    const attemptedMap = new Map<string, Set<string>>();
    const solvedMap = new Map<string, Set<string>>();

    submissions.forEach((sub) => {
      if (!sub.questionId) return;
      const uId = sub.userId || `anon_${sub.id}`;

      if (!attemptedMap.has(sub.questionId)) {
        attemptedMap.set(sub.questionId, new Set());
      }
      attemptedMap.get(sub.questionId)!.add(uId);

      if (sub.status === 'ACCEPTED') {
        if (!solvedMap.has(sub.questionId)) {
          solvedMap.set(sub.questionId, new Set());
        }
        solvedMap.get(sub.questionId)!.add(uId);
      }
    });

    const formattedItems = items.map((q) => {
      const attemptedUsers = attemptedMap.get(q.id)?.size || 0;
      const solvedUsers = solvedMap.get(q.id)?.size || 0;
      const acceptanceRate =
        attemptedUsers > 0 ? Math.round((solvedUsers / attemptedUsers) * 100) : 0;

      return {
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
        acceptance_rate: acceptanceRate,
      };
    });

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

    const submissions = await prisma.submission.findMany({
      where: { questionId: question.id },
      select: { id: true, userId: true, status: true },
    });

    const uniqueAttemptedUsers = new Set<string>();
    const uniqueSolvedUsers = new Set<string>();

    submissions.forEach((sub) => {
      const uId = sub.userId || `anon_${sub.id}`;
      uniqueAttemptedUsers.add(uId);
      if (sub.status === 'ACCEPTED') {
        uniqueSolvedUsers.add(uId);
      }
    });

    const attemptedCount = uniqueAttemptedUsers.size;
    const solvedCount = uniqueSolvedUsers.size;
    const acceptanceRate =
      attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0;

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
      acceptance_rate: acceptanceRate,
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
