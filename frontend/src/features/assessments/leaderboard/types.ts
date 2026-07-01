export interface ProblemsSolved {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl?: string;
  masteryScore: number;
  problemsSolved: ProblemsSolved;
  streak: number;
  languages: string[];
  rankTrend: 'up' | 'down' | 'same';
  isCurrentUser: boolean;
}
