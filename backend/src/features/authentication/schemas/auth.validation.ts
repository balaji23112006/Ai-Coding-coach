import { z } from 'zod';

export const signupSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    username: z.string().min(1, 'Username is required').optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => data.email || data.username, {
    message: 'Either email or username must be provided',
    path: ['email', 'username'],
  });
