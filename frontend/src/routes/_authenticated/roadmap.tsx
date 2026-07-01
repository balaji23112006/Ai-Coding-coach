import { createFileRoute } from '@tanstack/react-router';

import { RoadmapPage } from '@/features/recommendations/roadmap';

export const Route = createFileRoute('/_authenticated/roadmap')({
  component: RoadmapPage,
});
