import { ProfileAgentState } from '../state.js';
import { prisma } from '../../../database/prisma.js';

// Configuration parameters for deterministic calculations (configurable thresholds)
export const ANALYSIS_CONFIG = {
  MIN_SUBMISSIONS: 5,        // MIN_SUBMISSIONS for D1 and D3
  MIN_TOPICS: 3,             // MIN_TOPICS for D2
  MIN_RECENT_ACTIVITY: 3,     // MIN_RECENT_ACTIVITY for D4
  strengthMasteryThreshold: 80, // D5 Mastery > 80%
  strengthAttemptsThreshold: 5, // D5 Attempts >= THR
  weaknessMasteryThreshold: 60, // D6 Mastery < 60%
  weaknessStruggleAttempts: 3,  // D6 repeated failures (e.g. 3 consecutive wrong attempts)
  masteryWeights: {
    successRateWeight: 0.4, // Weight given to the raw success rate of attempts (0.0 to 1.0)
    difficultyWeight: 0.6, // Weight given to the depth/difficulty of solved questions (0.0 to 1.0)
  },
  difficultyPoints: {
    easy: 10,   // Points awarded for an Easy solved problem
    medium: 35,  // Points awarded for a Medium solved problem
    hard: 80,   // Points awarded for a Hard solved problem
  },
  maxExpectedPointsPerTopic: 150, // Points required in a single topic to achieve 100% difficulty weight
  difficultyHighSuccess: 75,     // Success rate >= 75% indicates comfort with a difficulty level
  difficultyLowSuccess: 40,      // Success rate <= 40% indicates struggle with a difficulty level
  levelThresholds: {
    advancedHardSuccessRate: 60,
    advancedHardSolvedCount: 5,
    intermediateEasySuccessRate: 80,
    intermediateMediumSuccessRate: 70,
    intermediateSolvedCount: 8,
  },
  consecutiveStreakLimit: 3,     // Minimum consecutive correct solutions to trigger a streak trend
  consecutiveStruggleLimit: 3,   // Minimum consecutive wrong submissions to trigger a struggle trend
};

/**
 * Node: AnalyzeMasteryNode
 * Calculates mastery scores for each topic using a combination of success rate
 * and weighted difficulty points from unique solved questions.
 */
export async function analyzeMasteryNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  const mastery: Record<string, number> = {};

  for (const [topicName, stats] of Object.entries(state.topicStats)) {
    // 1. Raw success rate score (0 to 100)
    const successScore = stats.successRate;

    // 2. Difficulty score based on solved counts
    const points =
      stats.easySolved * ANALYSIS_CONFIG.difficultyPoints.easy +
      stats.mediumSolved * ANALYSIS_CONFIG.difficultyPoints.medium +
      stats.hardSolved * ANALYSIS_CONFIG.difficultyPoints.hard;

    const difficultyScore = Math.min(100, (points / ANALYSIS_CONFIG.maxExpectedPointsPerTopic) * 100);

    // 3. Combined weighted mastery score
    const score =
      successScore * ANALYSIS_CONFIG.masteryWeights.successRateWeight +
      difficultyScore * ANALYSIS_CONFIG.masteryWeights.difficultyWeight;

    mastery[topicName] = Math.round(score);
  }

  return { mastery };
}

/**
 * Node: DetectTrendsNode
 * Analyzes chronological submissions to identify patterns (e.g. streaks, struggles, learning velocity).
 */
export async function detectTrendsNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  const trends: string[] = [];

  // Fetch all submissions for the user to compare time windows
  const allSubmissions = await prisma.submission.findMany({
    where: { userId: state.userId },
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

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentSubs = allSubmissions.filter((s) => s.createdAt >= sevenDaysAgo);
  const previousSubs = allSubmissions.filter((s) => s.createdAt >= thirtyDaysAgo && s.createdAt < sevenDaysAgo);

  const topicTrendsMap: Record<
    string,
    { recentAttempts: number; recentAccepted: number; prevAttempts: number; prevAccepted: number }
  > = {};

  const processSub = (sub: typeof allSubmissions[0], isRecent: boolean) => {
    if (!sub.question) return;
    const isAccepted = sub.status === 'ACCEPTED';
    for (const qt of sub.question.topics) {
      const topicName = qt.topic.name;
      if (!topicTrendsMap[topicName]) {
        topicTrendsMap[topicName] = { recentAttempts: 0, recentAccepted: 0, prevAttempts: 0, prevAccepted: 0 };
      }
      const data = topicTrendsMap[topicName];
      if (isRecent) {
        data.recentAttempts++;
        if (isAccepted) data.recentAccepted++;
      } else {
        data.prevAttempts++;
        if (isAccepted) data.prevAccepted++;
      }
    }
  };

  for (const s of recentSubs) {
    processSub(s, true);
  }
  for (const s of previousSubs) {
    processSub(s, false);
  }

  for (const [topic, data] of Object.entries(topicTrendsMap)) {
    if (data.recentAttempts > 0 && data.prevAttempts > 0) {
      const recentRate = Math.round((data.recentAccepted / data.recentAttempts) * 100);
      const prevRate = Math.round((data.prevAccepted / data.prevAttempts) * 100);
      const diff = recentRate - prevRate;
      if (diff >= 15) {
        trends.push(`${topic}: Improving (from ${prevRate}% to ${recentRate}%)`);
      } else if (diff <= -15) {
        trends.push(`${topic}: Declining (from ${prevRate}% to ${recentRate}%)`);
      } else {
        trends.push(`${topic}: Stable (${recentRate}%)`);
      }
    }
  }

  // 1. Consecutive correct/incorrect analysis (Streak vs Struggle)
  const sortedSubs = [...state.submissions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  ); // Newest first

  if (sortedSubs.length > 0) {
    let consecutiveCorrect = 0;
    let consecutiveIncorrect = 0;
    let countedStreak = false;
    let countedStruggle = false;

    for (const sub of sortedSubs) {
      if (sub.status === 'ACCEPTED') {
        consecutiveIncorrect = 0;
        if (!countedStreak) consecutiveCorrect++;
      } else {
        consecutiveCorrect = 0;
        if (!countedStruggle) consecutiveIncorrect++;
      }

      if (consecutiveCorrect >= ANALYSIS_CONFIG.consecutiveStreakLimit && !countedStreak) {
        trends.push(`Currently on a ${consecutiveCorrect}-problem solved streak!`);
        countedStreak = true;
      }
      if (consecutiveIncorrect >= ANALYSIS_CONFIG.consecutiveStruggleLimit && !countedStruggle) {
        trends.push(`Struggling recently with ${consecutiveIncorrect} consecutive incorrect submissions.`);
        countedStruggle = true;
      }
    }
  }

  // 2. Learning Velocity (attempts in last 48 hours)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentAttemptsCount = state.submissions.filter(
    (sub) => sub.createdAt >= fortyEightHoursAgo
  ).length;

  if (recentAttemptsCount >= 5) {
    trends.push(`High recent learning velocity: ${recentAttemptsCount} submission attempts in the last 48 hours.`);
  } else if (recentAttemptsCount > 0) {
    trends.push(`Moderate activity: ${recentAttemptsCount} submission attempts in the last 48 hours.`);
  }

  return { trends: Array.from(new Set(trends)) };
}

/**
 * Node: AssessDifficultyNode
 * Assesses comfort levels across Easy, Medium, and Hard categories.
 */
export async function assessDifficultyNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  const trends: string[] = [...state.trends];

  // Initialize accumulators
  const difficultyStats: Record<string, { total: number; accepted: number }> = {
    Easy: { total: 0, accepted: 0 },
    Medium: { total: 0, accepted: 0 },
    Hard: { total: 0, accepted: 0 },
  };

  for (const sub of state.submissions) {
    if (!sub.question) continue;
    const diff = sub.question.difficulty; // 'Easy', 'Medium', 'Hard'
    if (difficultyStats[diff]) {
      difficultyStats[diff].total++;
      if (sub.status === 'ACCEPTED') {
        difficultyStats[diff].accepted++;
      }
    }
  }

  for (const [diffLevel, stats] of Object.entries(difficultyStats)) {
    if (stats.total >= 3) {
      const rate = (stats.accepted / stats.total) * 100;
      if (rate >= ANALYSIS_CONFIG.difficultyHighSuccess) {
        trends.push(`Demonstrates strong comfort with ${diffLevel} difficulty problems (success rate: ${Math.round(rate)}%).`);
      } else if (rate <= ANALYSIS_CONFIG.difficultyLowSuccess) {
        trends.push(`Struggling with ${diffLevel} difficulty problems (success rate: ${Math.round(rate)}%).`);
      }
    }
  }

  return { trends: Array.from(new Set(trends)) };
}

/**
 * Node: ClassifyLevelNode
 * Classifies overall user proficiency level and calculates confidence score based on data density.
 */
export async function classifyLevelNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  let easyAttempts = 0;
  let easyAccepted = 0;
  let mediumAttempts = 0;
  let mediumAccepted = 0;
  let hardAttempts = 0;
  let hardAccepted = 0;

  const easySolvedSet = new Set<string>();
  const mediumSolvedSet = new Set<string>();
  const hardSolvedSet = new Set<string>();
  const allSolvedSet = new Set<string>();

  for (const sub of state.submissions) {
    if (!sub.question) continue;
    const diff = sub.question.difficulty;
    const isAccepted = sub.status === 'ACCEPTED';

    if (diff === 'Easy') {
      easyAttempts++;
      if (isAccepted) {
        easyAccepted++;
        easySolvedSet.add(sub.questionId || '');
        allSolvedSet.add(sub.questionId || '');
      }
    } else if (diff === 'Medium') {
      mediumAttempts++;
      if (isAccepted) {
        mediumAccepted++;
        mediumSolvedSet.add(sub.questionId || '');
        allSolvedSet.add(sub.questionId || '');
      }
    } else if (diff === 'Hard') {
      hardAttempts++;
      if (isAccepted) {
        hardAccepted++;
        hardSolvedSet.add(sub.questionId || '');
        allSolvedSet.add(sub.questionId || '');
      }
    }
  }

  const easySolved = easySolvedSet.size;
  const mediumSolved = mediumSolvedSet.size;
  const hardSolved = hardSolvedSet.size;
  const solvedCount = allSolvedSet.size;

  const easySuccessRate = easyAttempts > 0 ? (easyAccepted / easyAttempts) * 100 : 0;
  const mediumSuccessRate = mediumAttempts > 0 ? (mediumAccepted / mediumAttempts) * 100 : 0;
  const hardSuccessRate = hardAttempts > 0 ? (hardAccepted / hardAttempts) * 100 : 0;

  let level = 'Beginner';
  if (
    hardSuccessRate >= ANALYSIS_CONFIG.levelThresholds.advancedHardSuccessRate &&
    hardSolved >= ANALYSIS_CONFIG.levelThresholds.advancedHardSolvedCount
  ) {
    level = 'Advanced';
  } else if (
    (easySuccessRate >= ANALYSIS_CONFIG.levelThresholds.intermediateEasySuccessRate &&
      mediumSuccessRate >= ANALYSIS_CONFIG.levelThresholds.intermediateMediumSuccessRate) ||
    solvedCount >= ANALYSIS_CONFIG.levelThresholds.intermediateSolvedCount
  ) {
    level = 'Intermediate';
  }

  // Confidence calculation: scales with data volume up to 20 submissions
  const confidence = Math.min(1.0, Math.max(0.1, state.submissions.length / 20));

  return {
    level,
    confidence: Math.round(confidence * 100) / 100, // round to 2 decimal places
    easySolved,
    mediumSolved,
    hardSolved,
    solvedCount,
  };
}

/**
 * Node: IdentifyStrengthsNode
 * Filters mastery scores to find topics where performance excels.
 */
export async function identifyStrengthsNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  const strongAreas = Object.entries(state.mastery)
    .filter(([topic, score]) => {
      const stats = state.topicStats[topic];
      const attempts = stats ? stats.totalAttempts : 0;
      return score >= ANALYSIS_CONFIG.strengthMasteryThreshold && attempts >= ANALYSIS_CONFIG.strengthAttemptsThreshold;
    })
    .sort((a, b) => b[1] - a[1]) // highest first
    .map(([topic]) => topic);

  return { strongAreas };
}

/**
 * Node: IdentifyWeaknessesNode
 * Filters mastery scores to find topics with low scores and at least one attempt.
 */
export async function identifyWeaknessesNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  const weakAreas: string[] = [];

  for (const [topic, score] of Object.entries(state.mastery)) {
    const stats = state.topicStats[topic];
    const hasAttempts = stats ? stats.totalAttempts > 0 : false;
    if (!hasAttempts) continue;

    // Check if score is low
    const hasLowScore = score <= ANALYSIS_CONFIG.weaknessMasteryThreshold;

    // Check declining trend
    const hasDecliningTrend = state.trends.some((t) => t.startsWith(`${topic}: Declining`));

    // Check repeated failures (3 consecutive incorrect attempts)
    const topicSubmissions = await prisma.submission.findMany({
      where: {
        userId: state.userId,
        question: {
          topics: {
            some: {
              topic: {
                name: topic,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: ANALYSIS_CONFIG.weaknessStruggleAttempts,
    });
    const hasRepeatedFailures =
      topicSubmissions.length >= ANALYSIS_CONFIG.weaknessStruggleAttempts &&
      topicSubmissions.every((s) => s.status !== 'ACCEPTED');

    if (hasLowScore || hasDecliningTrend || hasRepeatedFailures) {
      weakAreas.push(topic);
    }
  }

  return {
    weakAreas: Array.from(new Set(weakAreas)),
  };
}

/**
 * Node: GenerateRecommendationsNode
 * Determines next focus area and recommended difficulty range.
 */
export async function generateRecommendationsNode(
  state: typeof ProfileAgentState.State
): Promise<Partial<typeof ProfileAgentState.State>> {
  // 1. Suggested Difficulty Range
  let recommendedDifficulty = 'Easy';
  if (state.level === 'Intermediate') {
    recommendedDifficulty = 'Medium';
  } else if (state.level === 'Advanced') {
    recommendedDifficulty = 'Hard';
  }

  // 2. Next Focus Topic
  let recommendedFocus = 'Arrays & Hashing';
  if (state.weakAreas.length > 0) {
    // Choose the weakest area (lowest score in mastery)
    let minScore = 101;
    let weakestTopic = '';
    for (const topic of state.weakAreas) {
      const score = state.mastery[topic] ?? 0;
      if (score < minScore) {
        minScore = score;
        weakestTopic = topic;
      }
    }
    if (weakestTopic) {
      recommendedFocus = weakestTopic;
    }
  } else {
    // Choose a topic with attempts that isn't a strength yet
    let minScore = 101;
    let fallbackTopic = '';
    for (const [topic, stats] of Object.entries(state.topicStats)) {
      if (stats.totalAttempts > 0 && !state.strongAreas.includes(topic)) {
        const score = state.mastery[topic] ?? 0;
        if (score < minScore) {
          minScore = score;
          fallbackTopic = topic;
        }
      }
    }
    if (fallbackTopic) {
      recommendedFocus = fallbackTopic;
    }
  }

  return {
    recommendedFocus,
    recommendedDifficulty,
  };
}
