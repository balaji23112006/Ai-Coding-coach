import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useAuth } from '@/features/authentication'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({
        to: '/auth/login',
        search: { redirect: window.location.href } as Record<string, string>,
      })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        />
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mt-6 text-sm font-bold uppercase tracking-widest text-violet-400 animate-pulse"
        >
          Securing Environment...
        </motion.p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070510] text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.24),_transparent_46%),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_42%),linear-gradient(180deg,#0d081e_0%,#070510_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}

