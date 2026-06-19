import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller.js';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';

const router = Router();

router.post('/run', (req, res, next) => submissionController.runCode(req, res, next));
router.post('/submit', authMiddleware, (req, res, next) => submissionController.submitCode(req, res, next));
router.get('/submissions/:questionId', authMiddleware, (req, res, next) => submissionController.getSubmissions(req, res, next));

export default router;
