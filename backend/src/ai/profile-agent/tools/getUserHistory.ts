import { prisma } from '../../../database/prisma.js';

export interface UserHistoryResult {
  userId: string;
  profile: {
    skills: Record<string, number>;
    solvedCount: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    learningTrack: string | null;
    experienceLevel: string | null;
    recommendedFocus: string | null;
    recommendedDifficulty: string | null;
  } | null;
  submissions: Array<{
    id: string;
    language: string;
    status: string;
    executionTime: number;
    memoryUsed: number;
    createdAt: Date;
    question: {
      id: string;
      title: string;
      difficulty: string;
    } | null;
  }>;
}

/**
 * Retrieves the profile and coding practice history for a user.
 * @param userId The unique user ID.
 */
export async function getUserHistory(userId: string): Promise<UserHistoryResult> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const submissions = await prisma.submission.findMany({
      where: { userId },
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
    });

    return {
      userId,
      profile: profile
        ? {
            skills: (profile.skills as Record<string, number>) || {},
            solvedCount: profile.solvedCount,
            easySolved: profile.easySolved,
            mediumSolved: profile.mediumSolved,
            hardSolved: profile.hardSolved,
            learningTrack: profile.learningTrack,
            experienceLevel: profile.experienceLevel,
            recommendedFocus: (profile as any).recommendedFocus,
            recommendedDifficulty: (profile as any).recommendedDifficulty,
          }
        : null,
      submissions: submissions.map((sub) => ({
        id: sub.id,
        language: sub.language,
        status: sub.status,
        executionTime: sub.executionTime,
        memoryUsed: sub.memoryUsed,
        createdAt: sub.createdAt,
        question: sub.question
          ? {
              id: sub.question.id,
              title: sub.question.title,
              difficulty: sub.question.difficulty,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error(`[Tool: getUserHistory] Error fetching history for user ${userId}:`, error);
    throw new Error(`Failed to retrieve user history: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getUserHistoryTool = {
  name: 'getUserHistory',
  description: "Retrieves the user's skill profile statistics and comprehensive coding submission history.",
  execute: async (userId: string): Promise<UserHistoryResult> => {
    return await getUserHistory(userId);
  },
};
