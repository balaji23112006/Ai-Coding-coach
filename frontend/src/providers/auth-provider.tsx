import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthContext } from '@/features/authentication/auth-context'
import {
  type AuthUser,
  authService,
  type LoginPayload,
  type SignupPayload,
} from '@/features/authentication/services/auth-service'
import { ApiError } from '@/services/api-client'

type AuthProviderProps = {
  children: ReactNode
}

function toAuthUser(user: {
  id: string
  email: string
  name: string
  username?: string
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.name,
    username: user.username,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const result = await authService.getSession()
      setUser(result.user ? toAuthUser(result.user) : null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    void authService
      .getSession()
      .then((result) => {
        if (isActive) {
          setUser(result.user ? toAuthUser(result.user) : null)
        }
      })
      .catch(() => {
        if (isActive) {
          setUser(null)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authService.login(payload)

    if (!result.user) {
      throw new ApiError('Login failed - no session returned', 401)
    }

    setUser(toAuthUser(result.user))
  }, [])

  const signup = useCallback(async (payload: SignupPayload) => {
    const result = await authService.signup(payload)

    if (!result.user) {
      throw new ApiError('Signup failed - no session returned', 400)
    }

    setUser(toAuthUser(result.user))
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      signup,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
