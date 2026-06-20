import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: pg.Pool;

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    pool = new pg.Pool({
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || '5432', 10),
      database: dbUrl.pathname.substring(1),
    });
  } catch (err) {
    console.error('[Postgres Pool Helper] Failed parsing DATABASE_URL, falling back to connectionString:', err);
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
} else {
  pool = new pg.Pool();
}

export { pool };

pool.on('connect', () => {
  console.log('[Postgres Pool] Database connected successfully.');
});

pool.on('error', (err) => {
  console.error('[Postgres Pool] Unexpected database connection error:', err);
});
