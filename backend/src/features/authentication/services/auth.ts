import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username } from 'better-auth/plugins';
import { prisma } from '../../../database/prisma.js';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    fields: {
      name: 'fullName',
    },
    additionalFields: {
      username: {
        type: 'string',
        required: true,
      },
      bio: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        required: false,
      },
      language: {
        type: 'string',
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session age every 1 day (in seconds)
  },
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
});
