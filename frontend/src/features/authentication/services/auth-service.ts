import { apiClient } from '@/services/api-client'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  username?: string
}

export type LoginPayload = {
  email?: string
  password: string
  username?: string
}

export type SignupPayload = {
  email: string
  fullName: string
  password: string
  username: string
}

type ServiceUser = {
  id: string
  email: string
  name: string
  username?: string
}

type AuthResult = {
  user: ServiceUser | null
}

export const authService = {
  getSession: () => apiClient.get<AuthResult>('/auth/session'),

  login: (payload: LoginPayload) => {
    return apiClient.post<AuthResult>('/auth/login', {
      email: payload.email || undefined,
      username: payload.username || undefined,
      password: payload.password,
    })
  },

  signup: (payload: SignupPayload) =>
    apiClient.post<AuthResult>('/auth/signup', {
      email: payload.email,
      fullName: payload.fullName,
      password: payload.password,
      username: payload.username,
    }),

  logout: () => apiClient.post<void>('/auth/logout'),
}
