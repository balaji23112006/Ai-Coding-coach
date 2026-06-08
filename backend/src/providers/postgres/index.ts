import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Export a PG Pool connection provider for raw SQL/Vector operations when needed
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('[Postgres Pool] Database connected successfully.');
});

pool.on('error', (err) => {
  console.error('[Postgres Pool] Unexpected database connection error:', err);
});
