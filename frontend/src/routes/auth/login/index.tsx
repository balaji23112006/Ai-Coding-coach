import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { KeyRound, Mail, User, ArrowRight, Sparkles, Bot, AlertCircle } from 'lucide-react'
import { useAuth } from '@/features/authentication'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/auth/login/')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    }
  },
  component: LoginPage,
})

type AuthMode = 'login' | 'signup'

function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/login/' })
  const { checkSession } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const payload: Record<string, string> = { password }
        if (email.includes('@')) {
          payload.email = email
        } else {
          payload.username = email
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Invalid username or password')
        }

        // Synchronize auth session state before navigating
        await checkSession()

        // Successfully logged in
        if (search.redirect) {
          window.location.href = search.redirect
        } else {
          void navigate({ to: '/dashboard' })
        }
      } else {
        // Sign up
        if (!email || !username || !fullName || !password) {
          throw new Error('All fields are required for sign up')
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, fullName, password }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to sign up')
        }

        // BetterAuth signup auto logs in the user, so synchronize session and navigate
        await checkSession()

        if (search.redirect) {
          window.location.href = search.redirect
        } else {
          void navigate({ to: '/dashboard' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070510] text-slate-100 overflow-hidden font-sans">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.18),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.1),_transparent_50%),linear-gradient(180deg,#0d081e_0%,#070510_100%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[120px] animate-pulse" />

      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo/Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] mb-4">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-violet-400">
            SKILL LENS
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            AI-Powered Coding Practice Arena
          </p>
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-violet-500/20 bg-[#120d20]/80 p-8 backdrop-blur-xl shadow-2xl shadow-violet-950/20">
          <div className="flex border-b border-violet-500/10 pb-5 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all border-b-2 ${
                mode === 'login'
                  ? 'border-violet-500 text-white shadow-[0_2px_10px_rgba(139,92,246,0.15)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all border-b-2 ${
                mode === 'signup'
                  ? 'border-violet-500 text-white shadow-[0_2px_10px_rgba(139,92,246,0.15)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#080512]/60 border border-violet-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. johndoe12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#080512]/60 border border-violet-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {mode === 'login' ? 'Email or Username' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  placeholder={mode === 'login' ? 'e.g. aniket@example.com' : 'e.g. john@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#080512]/60 border border-violet-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080512]/60 border border-violet-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition disabled:opacity-50 font-bold text-sm shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Access Arena' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Helper box */}
        <div className="mt-6 p-4 rounded-xl border border-dashed border-violet-500/20 bg-violet-500/5 text-center">
          <p className="text-[11px] text-slate-400">
            <Sparkles className="h-3 w-3 inline text-amber-400 mr-1 pb-0.5" />
            Quick Dev Login: use <strong className="text-violet-300">testuser@example.com</strong> / <strong className="text-violet-300">Password123!</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
