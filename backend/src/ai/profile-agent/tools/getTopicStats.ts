import { prisma } from '../../../database/prisma.js';

export interface TopicStat {
  topic: string;
  totalAttempts: number;
  solvedCount: number;
  successRate: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

/**
 * Calculates user solved stats, success rates, and difficulty counts aggregated by coding topic.
 * @param userId The unique user ID.
 */
export async function getTopicStats(userId: string): Promise<Record<string, TopicStat>> {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        question: {
          include: {
            topics: {
              include: {
                topic: true,
              },
            },
          },
        },
      },
    });

    const topicMap: Record<
      string,
      {
        totalAttempts: number;
        acceptedAttempts: number;
        solvedQuestions: Set<string>;
        easySolved: Set<string>;
        mediumSolved: Set<string>;
        hardSolved: Set<string>;
      }
    > = {};

    for (const sub of submissions) {
      if (!sub.question) continue;
      const question = sub.question;
      const isAccepted = sub.status === 'ACCEPTED';

      for (const qt of question.topics) {
        const topicName = qt.topic.name;

        if (!topicMap[topicName]) {
          topicMap[topicName] = {
            totalAttempts: 0,
            acceptedAttempts: 0,
            solvedQuestions: new Set<string>(),
            easySolved: new Set<string>(),
            mediumSolved: new Set<string>(),
            hardSolved: new Set<string>(),
          };
        }

        const stats = topicMap[topicName];
        stats.totalAttempts++;

        if (isAccepted) {
          stats.acceptedAttempts++;
          stats.solvedQuestions.add(question.id);

          if (question.difficulty === 'Easy') {
            stats.easySolved.add(question.id);
          } else if (question.difficulty === 'Medium') {
            stats.mediumSolved.add(question.id);
          } else if (question.difficulty === 'Hard') {
            stats.hardSolved.add(question.id);
          }
        }
      }
    }

    const result: Record<string, TopicStat> = {};

    for (const [topicName, data] of Object.entries(topicMap)) {
      result[topicName] = {
        topic: topicName,
        totalAttempts: data.totalAttempts,
        solvedCount: data.solvedQuestions.size,
        successRate: data.totalAttempts > 0
          ? Math.round((data.acceptedAttempts / data.totalAttempts) * 100)
          : 0,
        easySolved: data.easySolved.size,
        mediumSolved: data.mediumSolved.size,
        hardSolved: data.hardSolved.size,
      };
    }

    return result;
  } catch (error) {
    console.error(`[Tool: getTopicStats] Error fetching topic stats for user ${userId}:`, error);
    throw new Error(`Failed to retrieve topic stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getTopicStatsTool = {
  name: 'getTopicStats',
  description: "Calculates the user's solved counts, success rates, and difficulty breakdowns grouped by topic.",
  execute: async (userId: string): Promise<Record<string, TopicStat>> => {
    return await getTopicStats(userId);
  },
};
