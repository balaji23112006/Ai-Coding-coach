import { createFileRoute } from '@tanstack/react-router';

import { RoadmapPage } from '@/features/roadmap';

export const Route = createFileRoute('/_authenticated/roadmap')({
  component: RoadmapPage,
});
