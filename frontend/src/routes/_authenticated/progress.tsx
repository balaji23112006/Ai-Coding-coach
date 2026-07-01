import { createFileRoute } from '@tanstack/react-router';

import { ProgressPage } from '@/features/skill-gap-analysis/progress';

export const Route = createFileRoute('/_authenticated/progress')({
  component: ProgressPage,
});
