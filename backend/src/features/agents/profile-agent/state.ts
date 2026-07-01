import { Annotation } from '@langchain/langgraph';
import { UserHistoryResult } from './tools/getUserHistory.js';
import { TopicStat } from './tools/getTopicStats.js';
import { SubmissionWithQuestion } from '../../profiles/types/profile.types.js';
import { RecentActivityItem } from './tools/getRecentActivity.js';

export const ProfileAgentState = Annotation.Root({
  // The unique ID of the user being assessed
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Unique trace identifier for observability linking
  traceId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Detailed historical profile and code submissions
  history: Annotation<UserHistoryResult | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Statistics aggregated by coding topic
  topicStats: Annotation<Record<string, TopicStat>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  // List of submissions fetched during graph execution
  submissions: Annotation<SubmissionWithQuestion[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Chronological activity stream of the user
  recentActivity: Annotation<RecentActivityItem[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Calculated mastery rating for topics (e.g., {"Arrays": 0.85})
  mastery: Annotation<Record<string, number>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  // Computed behavioral or learning trends (e.g., ["struggling with Trees", "high success on Arrays"])
  trends: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // List of topics identified as strengths
  strongAreas: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // List of topics identified as weak/improvement areas
  weakAreas: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // The overall proficiency level of the user (e.g., "Beginner", "Intermediate", "Advanced")
  level: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'Beginner',
  }),

  // The agent's confidence score in the current assessment (0.0 to 1.0)
  confidence: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0.0,
  }),

  // Current status of the assessment (e.g., "UNINITIALIZED", "FETCHED", "ANALYZED", "SAVED")
  profileStatus: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'UNINITIALIZED',
  }),

  // Count of easy solved questions
  easySolved: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),

  // Count of medium solved questions
  mediumSolved: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),

  // Count of hard solved questions
  hardSolved: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),

  // Total count of unique solved questions
  solvedCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),

  // Next recommended topic to focus on
  recommendedFocus: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Suggested difficulty range
  recommendedDifficulty: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Track which agent tools have been executed in the current session
  toolsTried: Annotation<string[]>({
    reducer: (x, y) => Array.from(new Set([...x, ...y])),
    default: () => [],
  }),
});
