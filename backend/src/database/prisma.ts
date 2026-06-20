import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

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
    console.error('[Prisma Helper] Failed parsing DATABASE_URL, falling back to connectionString:', err);
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
} else {
  pool = new pg.Pool();
}

const adapter = new PrismaPg(pool);

export const prisma = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
