import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { prisma } from '../../../database/prisma.js';

const router = Router();

router.get('/summary', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Fetch all submissions for the user
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        question: {
          include: {
            topics: {
              include: { topic: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalQuestions = await prisma.question.count();

    // Get unique accepted questions solved
    const solvedQuestions = new Set<string>();
    const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };

    // Track topic mastery
    const solvedTopicsCount: Record<string, number> = {};
    const totalTopicsCount: Record<string, number> = {};

    // Get all questions to compute total per difficulty & topics
    const allQuestions = await prisma.question.findMany({
      include: {
        topics: {
          include: { topic: true },
        },
      },
    });

    allQuestions.forEach((q) => {
      q.topics.forEach((qt) => {
        const tName = qt.topic.name;
        totalTopicsCount[tName] = (totalTopicsCount[tName] || 0) + 1;
      });
    });

    submissions.forEach((sub) => {
      if (sub.status === 'ACCEPTED' && sub.question) {
        const q = sub.question;
        if (!solvedQuestions.has(q.id)) {
          solvedQuestions.add(q.id);
          solvedByDifficulty[q.difficulty]++;

          q.topics.forEach((qt) => {
            const tName = qt.topic.name;
            solvedTopicsCount[tName] = (solvedTopicsCount[tName] || 0) + 1;
          });
        }
      }
    });

    // Detailed Topic Performance
    const topicPerformance = await Promise.all(
      Object.keys(totalTopicsCount).map(async (tName) => {
        // Find all questions for this topic
        const topicQuestions = allQuestions.filter((q) =>
          q.topics.some((qt) => qt.topic.name === tName),
        );
        const topicQuestionIds = topicQuestions.map((q) => q.id);

        // Submissions for this topic
        const topicSubmissions = submissions.filter(
          (sub) => sub.questionId && topicQuestionIds.includes(sub.questionId),
        );
        const acceptedTopicSubmissions = topicSubmissions.filter(
          (sub) => sub.status === 'ACCEPTED',
        );

        // Solved questions (unique accepted)
        const solvedTopicQuestions = new Set(acceptedTopicSubmissions.map((sub) => sub.questionId));

        // Accuracy
        const accuracy =
          topicSubmissions.length > 0
            ? Math.round((acceptedTopicSubmissions.length / topicSubmissions.length) * 100)
            : 0;

        // Avg Time
        let avgTimeStr = '0 ms';
        if (acceptedTopicSubmissions.length > 0) {
          const totalTime = acceptedTopicSubmissions.reduce(
            (sum, sub) => sum + sub.executionTime,
            0,
          );
          const avgTime = Math.round(totalTime / acceptedTopicSubmissions.length);
          avgTimeStr = `${avgTime} ms`;
        }

        // Mastery score
        const solvedCount = solvedTopicQuestions.size;
        const totalCount = topicQuestions.length;
        const mastery = Math.round((solvedCount / totalCount) * 100);

        return {
          topic: tName,
          solved: solvedCount,
          accuracy,
          avgTime: avgTimeStr,
          mastery,
        };
      }),
    );

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;

    const solvedDates = new Set<string>();
    submissions.forEach((sub) => {
      if (sub.status === 'ACCEPTED') {
        const dateStr = sub.createdAt.toISOString().split('T')[0];
        solvedDates.add(dateStr);
      }
    });

    const sortedDates = Array.from(solvedDates).sort((a, b) => b.localeCompare(a)); // desc

    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        let tempStreak = 1;
        let lastDate = new Date(sortedDates[0]);

        for (let i = 1; i < sortedDates.length; i++) {
          const nextDate = new Date(sortedDates[i]);
          const diffTime = Math.abs(lastDate.getTime() - nextDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
            lastDate = nextDate;
          } else if (diffDays > 1) {
            break;
          }
        }
        currentStreak = tempStreak;
      }

      // Calculate longest streak
      const ascSortedDates = Array.from(solvedDates).sort((a, b) => a.localeCompare(b));
      let maxStreak = 1;
      let tempStreak = 1;
      let lastDate = new Date(ascSortedDates[0]);

      for (let i = 1; i < ascSortedDates.length; i++) {
        const nextDate = new Date(ascSortedDates[i]);
        const diffTime = Math.abs(nextDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
          tempStreak = 1;
        }
        lastDate = nextDate;
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
      longestStreak = maxStreak;
    }

    // Success rate
    const totalSubmissions = submissions.length;
    const acceptedSubmissions = submissions.filter((s) => s.status === 'ACCEPTED').length;
    const successRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // 30 days activity data
    const last30Days = Array.from({ length: 30 })
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      })
      .reverse();

    const activityData = last30Days.map((dateStr) => {
      const solvedCount = submissions.filter((sub) => {
        return sub.status === 'ACCEPTED' && sub.createdAt.toISOString().split('T')[0] === dateStr;
      }).length;
      return {
        day: dateStr,
        solved: solvedCount,
      };
    });

    // Heatmap data: solved count per day for the last 365 days
    const last365Days = Array.from({ length: 365 })
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      })
      .reverse();

    const heatmapData = last365Days.map((dateStr, idx) => {
      const solved = submissions.filter((sub) => {
        return sub.status === 'ACCEPTED' && sub.createdAt.toISOString().split('T')[0] === dateStr;
      }).length;
      let level = 0;
      if (solved > 0 && solved <= 2) level = 1;
      else if (solved > 2 && solved <= 4) level = 2;
      else if (solved > 4 && solved <= 6) level = 3;
      else if (solved > 6) level = 4;

      return {
        id: idx,
        date: dateStr,
        level,
        title: `${solved} problems solved on ${dateStr}`,
      };
    });

    const solvedQuestionIds = Array.from(solvedQuestions);
    const attemptedQuestionIds = Array.from(
      new Set(
        submissions
          .map((sub) => sub.questionId)
          .filter((id): id is string => id !== null && id !== undefined),
      ),
    );

    // Milestones construction
    const milestones: any[] = [];
    const processedQuestions = new Set<string>();

    // Sort submissions by date ascending to process milestones chronologically
    const cronSubmissions = [...submissions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    cronSubmissions.forEach((sub) => {
      if (sub.status === 'ACCEPTED' && sub.question && !processedQuestions.has(sub.question.id)) {
        processedQuestions.add(sub.question.id);
        milestones.push({
          type: 'milestone',
          title: `Solved ${sub.question.title}`,
          date: sub.createdAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          description: `Successfully passed all test cases for ${sub.question.title} (${sub.question.difficulty} difficulty).`,
        });
      }
    });

    milestones.reverse(); // most recent first

    if (currentStreak >= 3) {
      milestones.unshift({
        type: 'streak',
        title: `${currentStreak}-Day Streak!`,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        description: `You have been practicing consistently for ${currentStreak} days. Keep it up!`,
      });
    }

    // Dynamic AI Insights
    const aiInsights: any[] = [];
    if (solvedQuestions.size > 0) {
      aiInsights.push({
        text: `Your code execution success rate is ${successRate}%. Focus on optimization and tackling higher difficulty (Medium/Hard) challenges.`,
        badge: 'Accuracy Tip',
      });

      const slowTopics = topicPerformance.filter((t) => t.mastery > 0 && parseInt(t.avgTime) > 200);
      if (slowTopics.length > 0) {
        aiInsights.push({
          text: `Your solutions for ${slowTopics.map((t) => t.topic).join(', ')} are running slightly slow. Try analyzing loops and nested structure complexities.`,
          badge: 'Performance Advice',
        });
      } else {
        aiInsights.push({
          text: `Awesome efficiency! Your average execution time is well within optimal limits across all solved domains.`,
          badge: 'Speed Insight',
        });
      }

      if (currentStreak > 0) {
        aiInsights.push({
          text: `Consistent daily practice is paying off! Your streak is at ${currentStreak} day(s). Keep it active to lock in muscle memory.`,
          badge: 'Consistency',
        });
      }
    } else {
      aiInsights.push({
        text: `You haven't completed any problems yet. Start practicing with easy Arrays or Strings to build confidence!`,
        badge: 'Getting Started',
      });
    }

    const skills = topicPerformance.map((t) => ({
      topic: t.topic,
      score: t.mastery,
    }));

    res.json({
      success: true,
      stats: {
        solved: solvedQuestions.size,
        total: totalQuestions,
        easy: solvedByDifficulty.Easy,
        medium: solvedByDifficulty.Medium,
        hard: solvedByDifficulty.Hard,
        currentStreak,
        longestStreak,
        successRate,
        acceptedCount: acceptedSubmissions,
        totalAttempts: totalSubmissions,
      },
      solvedQuestionIds,
      attemptedQuestionIds,
      skills,
      topicPerformance,
      milestones,
      aiInsights,
      activityData,
      heatmapData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /roadmap
router.get('/roadmap', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Fetch all submissions for the user
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        question: {
          include: {
            topics: {
              include: { topic: true },
            },
          },
        },
      },
    });

    // Fetch all questions with topics
    const allQuestions = await prisma.question.findMany({
      include: {
        topics: {
          include: { topic: true },
        },
      },
    });

    // Map roadmap node ids to database topic matchers
    const roadmapDefinitions = [
      {
        id: 'basics',
        title: 'Programming Basics',
        match: (q: any) => q.difficulty === 'Easy',
        position: 'left',
      },
      {
        id: 'arrays',
        title: 'Arrays',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Arrays'),
        position: 'right',
      },
      {
        id: 'strings',
        title: 'Strings',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Strings'),
        position: 'left',
      },
      {
        id: 'hashmaps',
        title: 'Hash Maps',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'HashMap'),
        position: 'right',
      },
      {
        id: 'linkedlists',
        title: 'Linked Lists',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Linked List'),
        position: 'left',
      },
      {
        id: 'stack',
        title: 'Stack',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Stack'),
        position: 'right',
      },
      {
        id: 'binary-search',
        title: 'Binary Search',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Binary Search'),
        position: 'left',
      },
      {
        id: 'trees',
        title: 'Trees',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Trees'),
        position: 'right',
      },
      {
        id: 'graphs',
        title: 'Graphs',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Graphs'),
        position: 'left',
      },
      {
        id: 'mixed-topics',
        title: 'Mixed Topics',
        match: (q: any) =>
          q.topics.some((qt: any) =>
            ['Two Pointers', 'Sliding Window', 'Backtracking', 'Recursion'].includes(qt.topic.name),
          ),
        position: 'right',
      },
      {
        id: 'dp',
        title: 'Dynamic Programming',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Dynamic Programming'),
        position: 'left',
      },
      {
        id: 'greedy',
        title: 'Greedy Algorithms',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Greedy'),
        position: 'right',
      },
      {
        id: 'adv-graphs',
        title: 'Advanced Graphs',
        match: (q: any) =>
          q.topics.some((qt: any) =>
            ['DFS', 'BFS', 'Topological Sort', 'Dijkstra', 'Shortest Path'].includes(qt.topic.name),
          ),
        position: 'left',
      },
      {
        id: 'system-design',
        title: 'System Design Fundamentals',
        match: (q: any) => q.topics.some((qt: any) => qt.topic.name === 'Design'),
        position: 'right',
      },
    ];

    // Compute stats for each roadmap node
    const nodes = roadmapDefinitions.map((def) => {
      const matchingQuestions = allQuestions.filter(def.match);
      const questionIds = matchingQuestions.map((q) => q.id);

      const nodeSubmissions = submissions.filter(
        (sub) => sub.questionId && questionIds.includes(sub.questionId),
      );
      const acceptedSubmissions = nodeSubmissions.filter((sub) => sub.status === 'ACCEPTED');

      const uniqueSolved = new Set(acceptedSubmissions.map((sub) => sub.questionId)).size;
      const totalProblems = matchingQuestions.length;

      const completion = totalProblems > 0 ? Math.round((uniqueSolved / totalProblems) * 100) : 0;

      const accuracy =
        nodeSubmissions.length > 0
          ? Math.round((acceptedSubmissions.length / nodeSubmissions.length) * 100)
          : 0;

      let timeSpentStr = '0 ms';
      if (acceptedSubmissions.length > 0) {
        const totalTime = acceptedSubmissions.reduce((sum, sub) => sum + sub.executionTime, 0);
        timeSpentStr = `${totalTime} ms`;
      }

      return {
        id: def.id,
        title: def.title,
        solved: uniqueSolved,
        total: totalProblems,
        completion,
        accuracy,
        timeSpent: timeSpentStr,
        position: def.position,
      };
    });

    // Calculate status (completed, current, locked)
    const roadmapNodes = nodes.map((node, index) => {
      let status: 'completed' | 'current' | 'locked' = 'locked';
      const isNodeSolved = node.solved >= 1;

      if (isNodeSolved) {
        status = 'completed';
      } else if (index === 0) {
        status = 'current';
      } else {
        const prevNode = nodes[index - 1];
        const isPrevCompleted = prevNode.solved >= 1;
        if (isPrevCompleted) {
          status = 'current';
        } else {
          status = 'locked';
        }
      }

      return {
        id: node.id,
        title: node.title,
        status,
        problems: `${node.solved}/${node.total} Problems Solved`,
        position: node.position as 'left' | 'right',
        stats: {
          completion: node.completion,
          accuracy: node.accuracy,
          timeSpent: node.timeSpent,
        },
      };
    });

    const sidebarTopics = [
      { name: 'Basics', id: 'basics' },
      { name: 'Arrays', id: 'arrays' },
      { name: 'Strings', id: 'strings' },
      { name: 'Hash Maps', id: 'hashmaps' },
      { name: 'Linked Lists', id: 'linkedlists' },
      { name: 'Stack', id: 'stack' },
      { name: 'Binary Search', id: 'binary-search' },
      { name: 'Trees', id: 'trees' },
      { name: 'Graphs', id: 'graphs' },
      { name: 'Mixed Topics', id: 'mixed-topics' },
      { name: 'Dynamic Programming', id: 'dp' },
    ];

    const skillMastery = sidebarTopics.map((topic) => {
      const node = roadmapNodes.find((n) => n.id === topic.id);
      return {
        name: topic.name,
        progress: node ? node.stats.completion : 0,
      };
    });

    const totalSolved = nodes.reduce((sum, n) => sum + n.solved, 0);
    const totalPossible = nodes.reduce((sum, n) => sum + n.total, 0);
    const overallCompletion =
      totalPossible > 0 ? Math.round((totalSolved / totalPossible) * 100) : 0;
    const completedTopicsCount = roadmapNodes.filter((n) => n.status === 'completed').length;

    res.json({
      success: true,
      roadmapNodes,
      skillMastery,
      stats: {
        overallCompletion,
        completedTopicsCount,
        totalProblemsSolved: totalSolved,
        totalPossible,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /leaderboard
router.get('/leaderboard', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Fetch all users in the system and their accepted submissions
    const users = await prisma.user.findMany({
      include: {
        submissions: {
          include: {
            question: true,
          },
        },
      },
    });

    const parsedDbUsers = users.map((u) => {
      const acceptedSubmissions = u.submissions.filter(
        (s) => s.status === 'ACCEPTED' && s.question,
      );

      const solvedQuestions = new Map<string, string>(); // questionId -> difficulty
      acceptedSubmissions.forEach((sub) => {
        if (sub.questionId && sub.question) {
          solvedQuestions.set(sub.questionId, sub.question.difficulty);
        }
      });

      let easy = 0;
      let medium = 0;
      let hard = 0;

      solvedQuestions.forEach((diff) => {
        if (diff === 'Easy') easy++;
        else if (diff === 'Medium') medium++;
        else if (diff === 'Hard') hard++;
      });

      const total = easy + medium + hard;
      const masteryScore = easy * 10 + medium * 20 + hard * 30;

      const languagesSet = new Set<string>();
      acceptedSubmissions.forEach((sub) => {
        if (sub.language) {
          const lang =
            sub.language === 'JAVASCRIPT'
              ? 'JavaScript'
              : sub.language === 'PYTHON'
                ? 'Python'
                : sub.language;
          languagesSet.add(lang);
        }
      });

      const solvedDates = new Set<string>();
      acceptedSubmissions.forEach((sub) => {
        const dateStr = sub.createdAt.toISOString().split('T')[0];
        solvedDates.add(dateStr);
      });
      const sortedDates = Array.from(solvedDates).sort((a, b) => b.localeCompare(a));
      let currentStreak = 0;
      if (sortedDates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
          let tempStreak = 1;
          let lastDate = new Date(sortedDates[0]);
          for (let i = 1; i < sortedDates.length; i++) {
            const nextDate = new Date(sortedDates[i]);
            const diffTime = Math.abs(lastDate.getTime() - nextDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              tempStreak++;
              lastDate = nextDate;
            } else if (diffDays > 1) {
              break;
            }
          }
          currentStreak = tempStreak;
        }
      }

      const isCurrent = u.id === userId;

      return {
        rank: 0,
        username: u.username || u.fullName || 'Anonymous',
        masteryScore,
        problemsSolved: { easy, medium, hard, total },
        streak: currentStreak,
        languages: Array.from(languagesSet),
        rankTrend: 'same',
        isCurrentUser: isCurrent,
      };
    });

    const combined = [...parsedDbUsers];
    combined.sort(
      (a, b) => b.masteryScore - a.masteryScore || b.problemsSolved.total - a.problemsSolved.total,
    );

    combined.forEach((user, idx) => {
      user.rank = idx + 1;
    });

    res.json({
      success: true,
      leaderboard: combined,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
