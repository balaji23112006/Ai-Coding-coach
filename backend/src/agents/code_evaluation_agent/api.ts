import { Router } from 'express';
import { runEvaluation } from './agent.js';

export const evalRouter = Router();

evalRouter.post('/evaluate', async (req, res, next) => {
  try {
    const { userId, problemId, submittedCode, testCases, trigger, language } = req.body;

    if (!problemId || !submittedCode || !testCases) {
      return res.status(400).json({
        error: 'Missing required parameters: problemId, submittedCode, testCases',
      });
    }

    const state = await runEvaluation({
      userId: userId || 'anonymous',
      problemId,
      submittedCode,
      testCases,
      trigger: trigger || 'run',
      language: language || 'javascript',
    });

    if (state.error) {
      return res.status(500).json({ error: state.error });
    }

    return res.status(200).json({
      userId: state.userId,
      problemId: state.problemId,
      verdict: state.verdict,
      evalScore: state.evalScore,
      testResults: state.testResults
        ? {
            passed: state.testResults.passed,
            failed: state.testResults.failed,
            total: state.testResults.total,
            passRate: state.testResults.passRate,
          }
        : null,
      complexity: state.complexity,
      qualityScore: state.qualityReview?.qualityScore || 0,
      qualityGrade: state.qualityReview?.grade || 'Poor',
      bugReport: state.bugReport,
      feedback: state.feedback,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
