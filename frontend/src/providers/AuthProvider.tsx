import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  authService,
  type AuthUser,
  type LoginPayload,
  type SignupPayload,
} from '../features/authentication/services/auth-service';
import { ApiError } from '../services/api-client';

export type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.username,
          fullName: session.user.name,
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = async (payload: LoginPayload) => {
    const result = await authService.login(payload);
    if (result?.user) {
      setUser({
        id: result.user.id,
        username: result.user.username,
        fullName: result.user.name,
        email: result.user.email,
      });
    } else {
      throw new ApiError('Login failed — no session returned', 401);
    }
  };

  const signup = async (payload: SignupPayload) => {
    const result = await authService.signup(payload);
    if (result?.user) {
      setUser({
        id: result.user.id,
        username: result.user.username,
        fullName: result.user.name,
        email: result.user.email,
      });
    } else {
      throw new ApiError('Signup failed — no session returned', 400);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        '[AuthProvider] Server logout request failed, clearing local state anyway:',
        error,
      );
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        signup,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
