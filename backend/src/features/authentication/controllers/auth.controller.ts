import { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../../lib/auth.js';
import { signupSchema, loginSchema } from '../schemas/auth.validation.js';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

export class AuthController {
  async signup(req: Request, res: Response) {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, username, fullName, password } = parsed.data;

      // Check duplicate email
      const existingEmail = await authService.findUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Check duplicate username
      const existingUsername = await authService.findUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const authResponse = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: fullName,
          username,
        },
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
      });

      // Forward headers (e.g. Set-Cookie)
      authResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      if (!authResponse.ok) {
        const errData = await authResponse.json().catch(() => ({ message: 'Sign up failed' }));
        return res.status(authResponse.status).json({ error: errData.message || 'Sign up failed' });
      }

      const data = await authResponse.json();
      return res.status(201).json(data);
    } catch (error) {
      console.error('[Auth Controller] Signup error:', error);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email: inputEmail, username: inputUsername, password } = parsed.data;

      // Resolve identifier to email
      const identifier = inputEmail || inputUsername;
      if (!identifier) {
        return res.status(400).json({ error: 'Either email or username is required' });
      }

      const resolvedEmail = await authService.resolveEmail(identifier);
      if (!resolvedEmail) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const authResponse = await auth.api.signInEmail({
        body: {
          email: resolvedEmail,
          password,
        },
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
      });

      // Forward headers
      authResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      if (!authResponse.ok) {
        const errData = await authResponse.json().catch(() => ({ message: 'Invalid credentials' }));
        return res
          .status(authResponse.status)
          .json({ error: errData.message || 'Invalid credentials' });
      }

      const data = await authResponse.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('[Auth Controller] Login error:', error);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const authResponse = await auth.api.signOut({
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
      });

      authResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      return res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      console.error('[Auth Controller] Logout error:', error);
      return res.status(500).json({ error: 'Internal server error during logout' });
    }
  }

  async session(req: Request, res: Response) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      return res.status(200).json(session);
    } catch (error) {
      console.error('[Auth Controller] Session error:', error);
      return res.status(500).json({ error: 'Internal server error fetching session' });
    }
  }

  async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Session missing' });
    }

    return res.status(200).json({
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.name,
      email: req.user.email,
    });
  }
}
