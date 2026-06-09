/**
 * Authentication Service
 * Handles signup, login, logout, and session retrieval via the Express backend.
 */

import { apiClient } from '../../../services/api-client';

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
};

export type SessionResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    image?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    token: string;
    expiresAt: string;
    userId: string;
  };
} | null;

export type SignupPayload = {
  username: string;
  fullName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email?: string;
  username?: string;
  password: string;
};

export const authService = {
  signup: async (payload: SignupPayload) => {
    return apiClient.post<SessionResponse>('/auth/signup', payload);
  },

  login: async (payload: LoginPayload) => {
    return apiClient.post<SessionResponse>('/auth/login', payload);
  },

  logout: async () => {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  getSession: async (): Promise<SessionResponse> => {
    try {
      return await apiClient.get<SessionResponse>('/auth/session');
    } catch {
      return null;
    }
  },

  getMe: async (): Promise<AuthUser> => {
    return apiClient.get<AuthUser>('/auth/me');
  },
};
