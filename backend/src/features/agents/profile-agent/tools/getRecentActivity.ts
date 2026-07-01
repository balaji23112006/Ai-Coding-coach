import { prisma } from '../../../../database/prisma.js';

export interface RecentActivityItem {
  type: 'SUBMISSION' | 'PROFILE_CREATION' | 'PROFILE_UPDATE';
  timestamp: Date;
  description: string;
  meta: Record<string, any>;
}

/**
 * Retrieves a chronological stream of user activities (submissions, profile changes).
 * @param userId The unique user ID.
 * @param limit Maximum number of items.
 */
export async function getRecentActivity(userId: string, limit = 10): Promise<RecentActivityItem[]> {
  try {
    const activities: RecentActivityItem[] = [];

    // 1. Fetch recent submissions
    const submissions = await prisma.submission.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          select: {
            title: true,
            difficulty: true,
          },
        },
      },
    });

    for (const sub of submissions) {
      activities.push({
        type: 'SUBMISSION',
        timestamp: sub.createdAt,
        description: `Submitted solution for "${sub.question?.title || 'Unknown Question'}" (${sub.question?.difficulty || 'Unknown Difficulty'}) with status ${sub.status}.`,
        meta: {
          submissionId: sub.id,
          questionTitle: sub.question?.title,
          difficulty: sub.question?.difficulty,
          status: sub.status,
          language: sub.language,
          executionTime: sub.executionTime,
          memoryUsed: sub.memoryUsed,
        },
      });
    }

    // 2. Fetch profile creation & update times
const profile = await prisma.userProfile.findUnique({
  where: { userId },
});

if (profile) {
  activities.push({
    type: 'PROFILE_CREATION',
    timestamp: profile.createdAt,
    description: `Skill profile initialized.`,
    meta: {
      learningTrack: profile.learningTrack,
      experienceLevel: profile.experienceLevel,
    },
  });

  if (profile.updatedAt.getTime() !== profile.createdAt.getTime()) {
    activities.push({
      type: 'PROFILE_UPDATE',
      timestamp: profile.updatedAt,
      description: `Skill profile updated.`,
      meta: {
        learningTrack: profile.learningTrack,
        experienceLevel: profile.experienceLevel,
        skills: profile.skills,
        solvedCount: profile.solvedCount,
      },
    });
  }
}

    // Sort all activities chronologically, newest first, and slice to limit
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  } catch (error) {
    console.error(`[Tool: getRecentActivity] Error fetching activity for user ${userId}:`, error);
    throw new Error(
      `Failed to retrieve recent activity: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const getRecentActivityTool = {
  name: 'getRecentActivity',
  description:
    "Retrieves a chronological stream of the user's recent coding attempts and skill profile updates.",
  execute: async (params: { userId: string; limit?: number }): Promise<RecentActivityItem[]> => {
    return await getRecentActivity(params.userId, params.limit);
  },
};
