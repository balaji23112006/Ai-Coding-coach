import { createFileRoute } from '@tanstack/react-router';

import { PracticePage } from '@/features/assessments/practice';

export const Route = createFileRoute('/_authenticated/practice')({
  component: PracticePage,
});
