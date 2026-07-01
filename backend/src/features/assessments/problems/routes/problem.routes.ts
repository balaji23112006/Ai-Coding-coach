import { Router } from 'express';
import { problemController } from '../controllers/problem.controller.js';

const router = Router();

router.get('/questions', problemController.getList);
router.get('/questions/:slug', problemController.getBySlug);
router.get('/topics', problemController.getTopics);

export default router;
