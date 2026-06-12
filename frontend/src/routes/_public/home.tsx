import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_public/home')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">Welcome</h1>
    </div>
  )
}
