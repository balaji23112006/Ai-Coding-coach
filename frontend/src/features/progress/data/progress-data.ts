import type { TopicPerformance, DifficultyData } from '../types'

export const topicPerformanceData: TopicPerformance[] = [
  { topic: 'Arrays', solved: 0, accuracy: 0, avgTime: '0 min', mastery: 0 },
  { topic: 'Strings', solved: 0, accuracy: 0, avgTime: '0 min', mastery: 0 },
  { topic: 'Trees', solved: 0, accuracy: 0, avgTime: '0 min', mastery: 0 },
  { topic: 'Graphs', solved: 0, accuracy: 0, avgTime: '0 min', mastery: 0 },
  { topic: 'Dynamic Programming', solved: 0, accuracy: 0, avgTime: '0 min', mastery: 0 },
]

export const difficultyDistribution: DifficultyData[] = [
  { name: 'Easy', value: 0, fillDark: '#10b981', fillLight: '#059669' }, // Emerald
  { name: 'Medium', value: 0, fillDark: '#f59e0b', fillLight: '#d97706' }, // Amber
  { name: 'Hard', value: 0, fillDark: '#ef4444', fillLight: '#dc2626' }, // Red
]