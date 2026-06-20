import { Request, Response, NextFunction } from 'express';
import { problemService } from '../services/problem.service.js';
import { getQuestionsQuerySchema } from '../schemas/problem.schema.js';
import { ZodError } from 'zod';
import { ValidationError } from '../../../shared/errors/custom.errors.js';

export class ProblemController {
  async getList(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate and parse query parameters
      let parsedQuery;
      try {
        parsedQuery = getQuestionsQuerySchema.parse(req.query);
      } catch (err) {
        if (err instanceof ZodError) {
          const details = err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw new ValidationError('Query parameters validation failed', details);
        }
        throw err;
      }

      const result = await problemService.getQuestions(parsedQuery);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const result = await problemService.getQuestionBySlug(slug);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await problemService.getTopics();
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const problemController = new ProblemController();
