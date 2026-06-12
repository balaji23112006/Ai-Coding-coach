import { prisma } from '../../../database/prisma.js';
import { Prisma } from '@prisma/client';
import { GetQuestionsQuery } from '../schemas/problem.schema.js';

export class ProblemRepository {
  async findMany(filters: GetQuestionsQuery) {
    const { page, pageSize, difficulty, topic, search } = filters;
    const where: Prisma.QuestionWhereInput = {};

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (topic) {
      where.topics = {
        some: {
          topic: {
            name: {
              equals: topic,
              mode: 'insensitive',
            },
          },
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);

    return { items, total };
  }

  async findBySlug(slug: string) {
    return prisma.question.findUnique({
      where: { slug },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
        testCases: {
          where: {
            isHidden: false,
          },
        },
      },
    });
  }

  async findAllTopics() {
    return prisma.topic.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}

export const problemRepository = new ProblemRepository();
