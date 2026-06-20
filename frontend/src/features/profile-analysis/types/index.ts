import type { LucideIcon } from 'lucide-react'

export type ThemePreference = 'Dark' | 'Light' | 'System'

export interface UserProfile {
  name: string
  username: string
  bio: string
  email: string
  joinDate: string
  role: string
  language: string
}

export interface AchievementBadge {
  title: string
  icon: LucideIcon
  color: string
  bg: string
}

export interface PreferencesState {
  theme: ThemePreference
  animations: boolean
  wordWrap: boolean
  minimap: boolean
  complexityAnalysis: boolean
  autoCodeReview: boolean
  personalizedRecs: boolean
  dailyReminders: boolean
  streakAlerts: boolean
  milestoneAlerts: boolean
  editorTheme: string
  fontSize: string
  tabSize: string
  hintStyle: string
}
