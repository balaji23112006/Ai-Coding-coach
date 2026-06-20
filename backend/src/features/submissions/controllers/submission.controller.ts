import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service.js';
import { auth } from '../../../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { prisma } from '../../../database/prisma.js';

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
      let userId = req.body.userId;
      if (!userId) {
        try {
          const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
          });
          if (session?.user) {
            userId = session.user.id;
          } else {
            // Fallback to example user so that dashboard progress updates
            const exampleUser = await prisma.user.findUnique({
              where: { email: 'aniket@example.com' },
            });
            if (exampleUser) {
              userId = exampleUser.id;
            }
          }
        } catch (e) {
          console.error('[SubmissionController] Failed to resolve user session:', e);
        }
      }

      const result = await submissionService.submitCode({
        ...req.body,
        userId,
      });
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
