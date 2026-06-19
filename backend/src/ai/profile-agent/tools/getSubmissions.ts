import { prisma } from '../../../database/prisma.js';
import { SubmissionStatus } from '@prisma/client';
import { SubmissionWithQuestion } from '../../../features/profiles/types/profile.types.js';

export interface GetSubmissionsParams {
  userId: string;
  limit?: number;
  status?: SubmissionStatus;
}

/**
 * Fetches user's coding submissions, sorted by date (newest first).
 * @param params Filters and pagination parameters.
 */
export async function getSubmissions(params: GetSubmissionsParams): Promise<SubmissionWithQuestion[]> {
  const { userId, limit = 10, status } = params;
  try {
    const whereClause: any = { userId };
    if (status) {
      whereClause.status = status;
    }

    return await prisma.submission.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    }) as SubmissionWithQuestion[];
  } catch (error) {
    console.error(`[Tool: getSubmissions] Error fetching submissions for user ${userId}:`, error);
    throw new Error(`Failed to retrieve submissions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getSubmissionsTool = {
  name: 'getSubmissions',
  description: "Fetches user's code submissions, sorted by date (newest first), with optional limit and status filters.",
  execute: async (params: GetSubmissionsParams): Promise<SubmissionWithQuestion[]> => {
    return await getSubmissions(params);
  },
};
