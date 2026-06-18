import app from './app.js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { executionLogs } from './shared/utils/executionLogger.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 8000;
const LOGS_PORT = Number(process.env.LOGS_PORT) || 8001;

// Start main application server with error handling
const server = app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Error] Port ${PORT} is already in use.`);
    process.exit(1);
  }
  console.error('[Error] Unexpected server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[Server] Closed main server');
    process.exit(0);
  });
});

// Spin up a logs server on a separate port for viewing request/response payloads in JSON format
const logsApp = express();
logsApp.use(cors());
logsApp.get('/', (req, res) => {
  res.json(executionLogs);
});

const logsServer = logsApp.listen(LOGS_PORT, () => {
  console.log(`[Logs] Server listening on http://localhost:${LOGS_PORT}`);
});

logsServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Error] Logs port ${LOGS_PORT} is already in use.`);
    process.exit(1);
  }
  console.error('[Error] Unexpected logs server error:', err);
});

process.on('SIGTERM', () => {
  logsServer.close(() => {
    console.log('[Logs] Closed logs server');
  });
});


