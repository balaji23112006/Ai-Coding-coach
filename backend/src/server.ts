import app from './app.js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { executionLogs } from './shared/utils/executionLogger.js';

dotenv.config();

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(
    `[Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`,
  );
});

// Spin up a logs server on a separate port for viewing request/response payloads in JSON format
const logsApp = express();
logsApp.use(cors());

logsApp.get('/', (req, res) => {
  res.json(executionLogs);
});

logsApp.delete('/clear', (req, res) => {
  executionLogs.length = 0;
  res.json({ success: true, message: 'Logs cleared' });
});

const LOGS_PORT = process.env.LOGS_PORT || 8001;
logsApp.listen(LOGS_PORT, () => {
  console.log(`[Logs Server] Running on http://localhost:${LOGS_PORT}`);
});
