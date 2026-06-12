import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import authRoutes from './features/authentication/routes/auth.routes.js';
import submissionRoutes from './features/submissions/routes/submission.routes.js';
import problemRoutes from './features/problems/routes/problem.routes.js';
import progressRoutes from './features/progress/routes/progress.routes.js';
import mentorRoutes from './features/mentor/routes/mentor.routes.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { checkDockerAvailability } from './execution/sandbox/DockerDetector.js';

import { executionLogs } from './shared/utils/executionLogger.js';

// Perform startup check for Docker availability
checkDockerAvailability();

const app = express();

// Track Request IDs & logging context
app.use(requestIdMiddleware);

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

// Comprehensive Request/Response Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = (req as any).id || '';
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (body) {
    if (!(res as any)._logged) {
      (res as any)._logged = true;
      const duration = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.originalUrl,
        request: req.body,
        response: body,
        status: res.statusCode,
        duration,
      };

      executionLogs.push(logEntry);
      if (executionLogs.length > 500) {
        executionLogs.shift();
      }

      console.log(`[HTTP Logger] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
      console.log(`[HTTP Request Body]:`, JSON.stringify(req.body, null, 2));
      console.log(`[HTTP Response Body]:`, JSON.stringify(body, null, 2));
      console.log('----------------------------------------------------');
    }
    return originalJson.call(this, body);
  };

  res.send = function (body) {
    if (!(res as any)._logged) {
      (res as any)._logged = true;
      const duration = Date.now() - start;
      let parsedBody = body;
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch {}
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.originalUrl,
        request: req.body,
        response: parsedBody,
        status: res.statusCode,
        duration,
      };

      executionLogs.push(logEntry);
      if (executionLogs.length > 500) {
        executionLogs.shift();
      }

      console.log(`[HTTP Logger] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
      console.log(`[HTTP Request Body]:`, JSON.stringify(req.body, null, 2));
      console.log(`[HTTP Response Body]:`, JSON.stringify(parsedBody, null, 2));
      console.log('----------------------------------------------------');
    }
    return originalSend.call(this, body);
  };

  next();
});

app.use(morgan('dev'));

// Mount custom auth routes
app.use('/api/auth', authRoutes);

// Mount submission & code execution routes
app.use('/api', submissionRoutes);

// Mount problem & question bank routes
app.use('/api', problemRoutes);

// Mount user progress routes
app.use('/api/progress', progressRoutes);

// Mount AI mentor routes
app.use('/api/mentor', mentorRoutes);

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
