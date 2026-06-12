import { createFileRoute } from '@tanstack/react-router'
import Login from '../../_authenticated/login'

export const Route = createFileRoute('/auth/login/')({
  component: Login,
})
