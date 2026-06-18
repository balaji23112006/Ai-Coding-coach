import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller.js';

const router = Router();

router.post('/run', (req, res, next) => submissionController.runCode(req, res, next));
router.post('/submit', (req, res, next) => submissionController.submitCode(req, res, next));
router.get('/submissions/:questionId', (req, res, next) => submissionController.getSubmissions(req, res, next));

export default router;
