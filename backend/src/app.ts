import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import authRoutes from './features/authentication/routes/auth.routes.js';

const app = express();

// Middlewares
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

// Mount Better Auth catch-all BEFORE express.json()
app.all('/api/auth/*', (req, res, next) => {
  const path = req.path;
  if (
    path === '/api/auth/signup' ||
    path === '/api/auth/login' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/session' ||
    path === '/api/auth/me'
  ) {
    return next();
  }
  return toNodeHandler(auth)(req, res);
});

app.use(express.json());
app.use(morgan('dev'));

// Mount custom auth routes
app.use('/api/auth', authRoutes);

// Health check endpoint placeholder
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default app;
