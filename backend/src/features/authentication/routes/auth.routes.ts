import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();
const controller = new AuthController();

// Use bind to retain controller context
router.post('/signup', controller.signup.bind(controller));
router.post('/login', controller.login.bind(controller));
router.post('/logout', controller.logout.bind(controller));
router.get('/session', controller.session.bind(controller));
router.get('/me', authMiddleware, controller.me.bind(controller));
router.put('/profile', authMiddleware, controller.updateProfile.bind(controller));

export default router;
