import { Router, Request, Response, NextFunction } from 'express';
import { profileGraph } from '../../../ai/profile-agent/profileGraph.js';
import { profileRepository } from '../repository/profile.repository.js';
import { profileSummaryService } from '../../../ai/profile-agent/services/ProfileSummaryService.js';
import { agentLogger } from '../../../ai/profile-agent/services/AgentLogger.js';
import { langfuse } from '../../../providers/langfuse/index.js';
import { authMiddleware, adminMiddleware } from '../../../middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/ai/profile/logs
 * Retrieves the developer logs for the profile assessment agent.
 */
router.get('/logs', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = agentLogger.getLogs(50);
    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('[Profile API] Get logs error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/profile/run
 * Runs the profile agent assessment graph for a user.
 */
router.post('/run', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required in the request body.' });
    return;
  }

  const traceId = `trace-run-${userId}-${Date.now()}`;
  agentLogger.startRun(userId, 'run', traceId);
  agentLogger.logRequest(traceId, { userId });

  try {
    const finalState = await profileGraph.invoke({ userId, traceId });

    let summary = '';
    let trendExplanation = '';

    // Only invoke LLM summary if not in bootstrap state
    if (finalState.profileStatus !== 'BOOTSTRAP') {
      summary = await profileSummaryService.generateProfileSummary({
        level: finalState.level,
        mastery: finalState.mastery,
        strongAreas: finalState.strongAreas,
        weakAreas: finalState.weakAreas,
        traceId,
      });

      trendExplanation = await profileSummaryService.generateTrendExplanation({
        trends: finalState.trends,
        recentActivityCount: finalState.recentActivity.length,
        traceId,
      });
    } else {
      summary =
        'Welcome to the coding practice coach! Submit some solutions to start tracking your skill metrics.';
      trendExplanation = 'No recent coding attempts recorded.';
    }

    const responsePayload = {
      success: true,
      userId: finalState.userId,
      level: finalState.level,
      confidence: finalState.confidence,
      mastery: finalState.mastery,
      strongAreas: finalState.strongAreas,
      weakAreas: finalState.weakAreas,
      trends: finalState.trends,
      profileStatus: finalState.profileStatus,
      easySolved: finalState.easySolved || 0,
      mediumSolved: finalState.mediumSolved || 0,
      hardSolved: finalState.hardSolved || 0,
      solvedCount: finalState.solvedCount || 0,
      recommendedFocus: finalState.recommendedFocus || 'None',
      recommendedDifficulty: finalState.recommendedDifficulty || 'Easy',
      summary,
      trendExplanation,
    };

    agentLogger.logResponse(traceId, responsePayload);
    await agentLogger.finalizeRun(traceId, 'completed');

    await langfuse.flushAsync();
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[Profile API] Run error:', error);
    await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));
    await langfuse.flushAsync();
    next(error);
  }
});

/**
 * GET /api/ai/profile/:userId
 * Retrieves the current UserProfile record from the database.
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'userId parameter is required.' });
      return;
    }

    let profile = await profileRepository.getProfile(userId);
    if (!profile) {
      try {
        profile = await profileRepository.saveProfile({
          user: { connect: { id: userId } },
          skills: {},
          solvedCount: 0,
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          learningTrack: 'Software Engineering',
          experienceLevel: 'Beginner',
          recommendedFocus: 'Arrays & Hashing',
          recommendedDifficulty: 'Easy',
        });
      } catch (err) {
        console.warn(
          `[Profile API] Could not auto-bootstrap profile for user ${userId}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (!profile) {
      res.status(200).json({
        success: true,
        profile: null,
        message: `No profile record found for user ID: ${userId}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      profile: {
        userId: profile.userId,
        skills: profile.skills,
        solvedCount: profile.solvedCount,
        easySolved: profile.easySolved,
        mediumSolved: profile.mediumSolved,
        hardSolved: profile.hardSolved,
        learningTrack: profile.learningTrack,
        experienceLevel: profile.experienceLevel,
        recommendedFocus: profile.recommendedFocus,
        recommendedDifficulty: profile.recommendedDifficulty,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Profile API] Get profile error:', error);
    next(error);
  }
});

/**
 * POST /api/ai/profile/refresh/:userId
 * Forces a refresh calculation by running the assessment graph.
 */
router.post(
  '/refresh/:userId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'userId parameter is required.' });
      return;
    }

    const traceId = `trace-refresh-${userId}-${Date.now()}`;
    agentLogger.startRun(userId, 'refresh', traceId);
    agentLogger.logRequest(traceId, { userId });

    try {
      const finalState = await profileGraph.invoke({ userId, traceId });

      let summary = '';
      let trendExplanation = '';

      if (finalState.profileStatus !== 'BOOTSTRAP') {
        summary = await profileSummaryService.generateProfileSummary({
          level: finalState.level,
          mastery: finalState.mastery,
          strongAreas: finalState.strongAreas,
          weakAreas: finalState.weakAreas,
          traceId,
        });

        trendExplanation = await profileSummaryService.generateTrendExplanation({
          trends: finalState.trends,
          recentActivityCount: finalState.recentActivity.length,
          traceId,
        });
      } else {
        summary = 'Welcome! Submit some solutions to start tracking your skill metrics.';
        trendExplanation = 'No recent coding attempts recorded.';
      }

      const responsePayload = {
        success: true,
        userId: finalState.userId,
        level: finalState.level,
        confidence: finalState.confidence,
        mastery: finalState.mastery,
        strongAreas: finalState.strongAreas,
        weakAreas: finalState.weakAreas,
        trends: finalState.trends,
        profileStatus: finalState.profileStatus,
        easySolved: finalState.easySolved || 0,
        mediumSolved: finalState.mediumSolved || 0,
        hardSolved: finalState.hardSolved || 0,
        solvedCount: finalState.solvedCount || 0,
        recommendedFocus: finalState.recommendedFocus || 'None',
        recommendedDifficulty: finalState.recommendedDifficulty || 'Easy',
        summary,
        trendExplanation,
      };

      agentLogger.logResponse(traceId, responsePayload);
      await agentLogger.finalizeRun(traceId, 'completed');

      await langfuse.flushAsync();
      res.status(200).json(responsePayload);
    } catch (error: any) {
      console.error('[Profile API] Refresh error:', error);
      await agentLogger.finalizeRun(traceId, 'failed', error.message || String(error));
      await langfuse.flushAsync();
      next(error);
    }
  },
);

export default router;
