export const RECOMMENDATION_CONFIG = {
  // Submission history
  SUBMISSION_HISTORY_LIMIT: 100,
  RECENT_ACTIVITY_SLICE: 5,
  
  // Activity thresholds
  HIGH_ACTIVITY_THRESHOLD: 20,
  LOW_ACTIVITY_THRESHOLD: 10,
  
  // Mistake analysis
  TIMEOUT_THRESHOLD_MS: 5000,
  
  // Search
  SEARCH_PAGE_SIZE: 10,
  FALLBACK_TOPIC: 'Arrays',
  
  // Ranking scores
  SCORES: {
    TOPIC_MATCH: 50,
    WEAK_TOPIC_BONUS: 100,
    EASY_PROBLEM: 75,
    MEDIUM_PROBLEM: 80,
    HARD_PROBLEM: 30,
  },
  
  // API
  GEMINI_MODEL_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  GEMINI_TIMEOUT_MS: 10000,
  GRAPH_TIMEOUT_MS: 60000,
  
  // Polling
  MAX_POLL_ATTEMPTS: 10,
  POLL_INTERVAL_MS: 3000,
};
