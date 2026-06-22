import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service.js';
import { logger } from '../../../shared/utils/logger.js';

export class SubmissionController {
  async runCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { questionId, language, sourceCode } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`[SubmissionCtrl] runCode: questionId=${questionId}, language=${language}`);

      const result = await submissionService.runCode({
        questionId,
        userId,
        language,
        sourceCode,
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('[SubmissionCtrl] runCode failed:', error);
      next(error);
    }
  }

  async submitCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { questionId, language, sourceCode } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`[SubmissionCtrl] submitCode: questionId=${questionId}, language=${language}`);

      const result = await submissionService.submitCode({
        questionId,
        userId,
        language,
        sourceCode,
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('[SubmissionCtrl] submitCode failed:', error);
      next(error);
    }
  }

  async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { questionId } = req.params;
      const userId = (req as any).user?.id;

      logger.info(`[SubmissionCtrl] getSubmissions: questionId=${questionId}, userId=${userId}`);

      const result = await submissionService.getSubmissionHistory(questionId, userId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('[SubmissionCtrl] getSubmissions failed:', error);
      next(error);
    }
  }
}

export const submissionController = new SubmissionController();
