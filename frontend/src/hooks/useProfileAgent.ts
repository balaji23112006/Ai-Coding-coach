import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../features/authentication/hooks/use-auth'

export interface ProfileData {
  userId: string;
  skills: Record<string, number>;
  solvedCount: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  learningTrack: string | null;
  experienceLevel: string | null;
  recommendedFocus?: string | null;
  recommendedDifficulty?: string | null;
  createdAt?: string;
  updatedAt?: string;
  trends?: string[];
  strongAreas?: string[];
  weakAreas?: string[];
  confidence?: number;
}

export function useProfileAgent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [trendExplanation, setTrendExplanation] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const runAgent = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/profile/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to run profile assessment')
      }
      const data = await res.json()
      if (data.success) {
        setProfile({
          userId: data.userId,
          skills: data.mastery || {},
          solvedCount: data.solvedCount || 0,
          easySolved: data.easySolved || 0,
          mediumSolved: data.mediumSolved || 0,
          hardSolved: data.hardSolved || 0,
          learningTrack: null,
          experienceLevel: data.level,
          recommendedFocus: data.recommendedFocus,
          recommendedDifficulty: data.recommendedDifficulty,
          trends: data.trends || [],
          strongAreas: data.strongAreas || [],
          weakAreas: data.weakAreas || [],
          confidence: data.confidence,
        })
        setAiSummary(data.summary || '')
        setTrendExplanation(data.trendExplanation || '')
      }
    } catch (err: any) {
      console.error('[useProfileAgent] Error running agent:', err)
      setError(err.message || 'Error running assessment agent')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/profile/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.profile) {
          setProfile({
            userId: data.profile.userId,
            skills: data.profile.skills || {},
            solvedCount: data.profile.solvedCount || 0,
            easySolved: data.profile.easySolved || 0,
            mediumSolved: data.profile.mediumSolved || 0,
            hardSolved: data.profile.hardSolved || 0,
            learningTrack: data.profile.learningTrack,
            experienceLevel: data.profile.experienceLevel,
            recommendedFocus: data.profile.recommendedFocus,
            recommendedDifficulty: data.profile.recommendedDifficulty,
            createdAt: data.profile.createdAt,
            updatedAt: data.profile.updatedAt,
            trends: data.profile.skills ? [] : [], // fallback
            strongAreas: [],
            weakAreas: [],
          })
          
          // Trigger a baseline LLM summary calculation when loading the dashboard
          // this makes sure summaries exist even if they weren't stored in user profile
          if (data.profile.skills && Object.keys(data.profile.skills).length > 0) {
            void refreshProfile();
          }
        }
      } else if (res.status === 404) {
        // If not found, trigger runAgent to initialize!
        await runAgent()
      } else {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch user profile')
      }
    } catch (err: any) {
      console.error('[useProfileAgent] Error fetching profile:', err)
      setError(err.message || 'Error loading profile')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, runAgent])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    setIsRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/profile/refresh/${user.id}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to refresh profile')
      }
      const data = await res.json()
      if (data.success) {
        setProfile({
          userId: data.userId,
          skills: data.mastery || {},
          solvedCount: data.solvedCount || 0,
          easySolved: data.easySolved || 0,
          mediumSolved: data.mediumSolved || 0,
          hardSolved: data.hardSolved || 0,
          learningTrack: null,
          experienceLevel: data.level,
          recommendedFocus: data.recommendedFocus,
          recommendedDifficulty: data.recommendedDifficulty,
          trends: data.trends || [],
          strongAreas: data.strongAreas || [],
          weakAreas: data.weakAreas || [],
          confidence: data.confidence,
        })
        setAiSummary(data.summary || '')
        setTrendExplanation(data.trendExplanation || '')
      }
    } catch (err: any) {
      console.error('[useProfileAgent] Error refreshing profile:', err)
      setError(err.message || 'Error refreshing profile')
    } finally {
      setIsRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      void fetchProfile()
    }
  }, [user?.id, fetchProfile])

  return {
    profile,
    aiSummary,
    trendExplanation,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchProfile,
    refresh: refreshProfile,
  }
}
