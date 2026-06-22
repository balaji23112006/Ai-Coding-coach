import { prisma } from '../../../database/prisma.js';
import { Prisma, Submission } from '@prisma/client';

export class SubmissionRepository {
  async create(data: Prisma.SubmissionCreateInput): Promise<Submission> {
    return prisma.submission.create({ data });
  }

  async findById(id: string): Promise<Submission | null> {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
  return prisma.submission.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
}

export const submissionRepository = new SubmissionRepository();
