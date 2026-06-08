import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(
    `[Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`,
  );
});
