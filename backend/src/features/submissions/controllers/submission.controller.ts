import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service.js';

export class SubmissionController {
  async run(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await submissionService.runCode(req.body);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await submissionService.submitCode(req.body);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const submission = await submissionService.getSubmission(id);
      return res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const submissionController = new SubmissionController();
