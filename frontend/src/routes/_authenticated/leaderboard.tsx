import { createFileRoute } from '@tanstack/react-router';

import { LeaderboardPage } from '@/features/assessments/leaderboard';

export const Route = createFileRoute('/_authenticated/leaderboard')({
  component: LeaderboardPage,
});
