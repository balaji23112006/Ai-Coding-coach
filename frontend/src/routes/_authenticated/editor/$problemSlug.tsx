import { createFileRoute } from '@tanstack/react-router';

import { EditorPage } from '@/features/assessments/code-editor';

export const Route = createFileRoute('/_authenticated/editor/$problemSlug')({
  component: EditorPage,
});
