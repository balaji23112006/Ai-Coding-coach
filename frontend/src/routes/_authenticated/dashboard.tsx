import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/features/profile-analysis/dashboard';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});
