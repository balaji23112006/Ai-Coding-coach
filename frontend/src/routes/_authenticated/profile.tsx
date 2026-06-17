import { createFileRoute } from '@tanstack/react-router'

import { ProfilePage } from '@/features/profile-analysis'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})
