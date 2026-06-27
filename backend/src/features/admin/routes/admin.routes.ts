import { Router } from 'express';
import { prisma } from '../../../database/prisma.js';
import { authMiddleware, adminMiddleware } from '../../../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes with auth + admin check
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/users
 * Returns a list of users, matching a search term if provided.
 */
router.get('/users', async (req, res, next) => {
  try {
    const search = req.query.search as string || '';
    
    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ]
      } : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        image: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/make-admin
 * Sets a user's role to 'admin'.
 */
router.post('/users/:userId/make-admin', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: 'admin' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      }
    });

    res.status(200).json({
      success: true,
      message: `User ${updated.fullName} promoted to admin successfully.`,
      user: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
