import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller.js';
import { validateBody } from '../../../middlewares/validation.middleware.js';
import { runCodeSchema, submitCodeSchema } from '../schemas/submission.schema.js';

const router = Router();

router.post('/run', validateBody(runCodeSchema), submissionController.run);
router.post('/submit', validateBody(submitCodeSchema), submissionController.submit);
router.get('/submissions/:id', submissionController.getById);

export default router;
