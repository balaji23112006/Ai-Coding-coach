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

      const clientHeaders = { ...req.headers };
      delete clientHeaders.cookie;

      const authResponse = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: fullName,
          username,
        },
        headers: fromNodeHeaders(clientHeaders),
        asResponse: true,
      });

      // Forward headers (e.g. Set-Cookie) using append for multi-value set-cookie
      authResponse.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') {
          res.append(key, value);
        } else {
          res.setHeader(key, value);
        }
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

      const clientHeaders = { ...req.headers };
      delete clientHeaders.cookie;

      const authResponse = await auth.api.signInEmail({
        body: {
          email: resolvedEmail,
          password,
        },
        headers: fromNodeHeaders(clientHeaders),
        asResponse: true,
      });

      // Forward headers (e.g. Set-Cookie) using append for multi-value set-cookie
      authResponse.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') {
          res.append(key, value);
        } else {
          res.setHeader(key, value);
        }
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

      // Forward headers (e.g. Set-Cookie) using append for multi-value set-cookie
      authResponse.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') {
          res.append(key, value);
        } else {
          res.setHeader(key, value);
        }
      });

      // Explicitly clear session cookie
      res.clearCookie('better-auth.session_token', { path: '/' });

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
      bio: (req.user as any).bio || '',
      role: (req.user as any).role || '',
      language: (req.user as any).language || '',
      createdAt: (req.user as any).createdAt || new Date().toISOString(),
    });
  }

  async updateProfile(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Session missing' });
    }

    try {
      const { fullName, bio, role, language } = req.body;

      const updated = await authService.updateUser(req.user.id, {
        fullName,
        bio,
        role,
        language,
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updated.id,
          username: updated.username,
          fullName: updated.fullName,
          email: updated.email,
          bio: updated.bio,
          role: updated.role,
          language: updated.language,
          createdAt: updated.createdAt,
        },
      });
    } catch (error) {
      console.error('[Auth Controller] Update profile error:', error);
      return res.status(500).json({ error: 'Internal server error updating profile' });
    }
  }
}
