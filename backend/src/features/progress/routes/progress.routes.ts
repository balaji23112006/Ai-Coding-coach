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
              include: { topic: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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
          include: { topic: true }
        }
      }
    });

    allQuestions.forEach(q => {
      q.topics.forEach(qt => {
        const tName = qt.topic.name;
        totalTopicsCount[tName] = (totalTopicsCount[tName] || 0) + 1;
      });
    });

    submissions.forEach(sub => {
      if (sub.status === 'ACCEPTED' && sub.question) {
        const q = sub.question;
        if (!solvedQuestions.has(q.id)) {
          solvedQuestions.add(q.id);
          solvedByDifficulty[q.difficulty]++;
          
          q.topics.forEach(qt => {
            const tName = qt.topic.name;
            solvedTopicsCount[tName] = (solvedTopicsCount[tName] || 0) + 1;
          });
        }
      }
    });

    // Topic mastery score (percentage)
    const skills = Object.keys(totalTopicsCount).map(tName => {
      const solved = solvedTopicsCount[tName] || 0;
      const total = totalTopicsCount[tName] || 1;
      return {
        topic: tName,
        score: Math.round((solved / total) * 100)
      };
    });

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;
    
    const solvedDates = new Set<string>();
    submissions.forEach(sub => {
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
    const acceptedSubmissions = submissions.filter(s => s.status === 'ACCEPTED').length;
    const successRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // 30 days activity data
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const activityData = last30Days.map(dateStr => {
      const solvedCount = submissions.filter(sub => {
        return sub.status === 'ACCEPTED' && sub.createdAt.toISOString().split('T')[0] === dateStr;
      }).length;
      return {
        day: dateStr,
        solved: solvedCount
      };
    });

    // Heatmap data: solved count per day for the last 365 days
    const last365Days = Array.from({ length: 365 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const heatmapData = last365Days.map((dateStr, idx) => {
      const solved = submissions.filter(sub => {
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
        title: `${solved} problems solved on ${dateStr}`
      };
    });

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
        totalAttempts: totalSubmissions
      },
      skills,
      activityData,
      heatmapData
    });
  } catch (err) {
    next(err);
  }
});

export default router;
