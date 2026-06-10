import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import authRoutes from './features/authentication/routes/auth.routes.js';
import submissionRoutes from './features/submissions/routes/submission.routes.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { checkDockerAvailability } from './execution/sandbox/DockerDetector.js';

import { executionLogs } from './shared/utils/executionLogger.js';

// Perform startup check for Docker availability
checkDockerAvailability();

const app = express();

// Track Request IDs & logging context
app.use(requestIdMiddleware);

// Middleware to intercept and store JSON request/response payloads for monitoring
app.use((req, res, next) => {
  const path = req.path;
  if (path === '/api/run' || path === '/api/submit') {
    const originalJson = res.json;
    res.json = function (body) {
      executionLogs.push({
        timestamp: new Date().toISOString(),
        requestId: req.id,
        type: path === '/api/run' ? 'run' : 'submit',
        request: req.body,
        response: body,
      });
      return originalJson.call(this, body);
    };
  }
  next();
});

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

// Mount submission & code execution routes
app.use('/api', submissionRoutes);

// Health check endpoint placeholder
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Utility APIs
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/version', (_req, res) => {
  res.status(200).json({
    service: 'code-execution',
    version: '1.0.0',
  });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;

