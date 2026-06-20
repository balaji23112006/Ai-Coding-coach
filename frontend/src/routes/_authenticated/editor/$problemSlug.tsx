import { createFileRoute } from '@tanstack/react-router';

import { EditorPage } from '@/features/code-editor';

export const Route = createFileRoute('/_authenticated/editor/$problemSlug')({
  component: EditorPage,
});
