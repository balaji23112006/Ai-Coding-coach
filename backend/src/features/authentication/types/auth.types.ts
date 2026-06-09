import { z } from 'zod';
import { signupSchema, loginSchema } from '../schemas/auth.validation.js';

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUserResponse {
  id: string;
  username: string;
  fullName: string;
  email: string;
}
