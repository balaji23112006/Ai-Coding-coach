// src/features/mentor/controllers/mentor.controller.ts
import { Request, Response } from 'express';
import { mentorService } from '../mentor.service.js';

export class MentorController {
  async handleHint(req: Request, res: Response) {
    try {
      const result = await mentorService.generateHint(req.body);
      res.json(result);
    } catch (err) {
      console.error('Mentor hint error:', err);
      res.status(500).json({ error: 'Failed to generate hint' });
    }
  }
}

export const mentorController = new MentorController();
