import { useNavigate } from '@tanstack/react-router';
import { LogOut, Code2, BookOpen, Sparkles, Trophy, Flame, Target } from 'lucide-react';
import { useAuth } from '../features/authentication/hooks/useAuth';
import Button from '../components/ui/Button';
import { useState } from 'react';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate({ to: '/login' });
    } catch {
      setIsLoggingOut(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.username?.slice(0, 2).toUpperCase() ?? '??');

  return (
    <main className="min-h-screen bg-[#050508] text-white antialiased">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_25%,_rgba(34,211,238,0.08),_transparent_40%),radial-gradient(circle_at_80%_75%,_rgba(168,85,247,0.08),_transparent_40%)]" />
      <div
        className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.012)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-40"
        style={{
          maskImage: 'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 sm:px-10">
        {/* Top Bar */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-cyan-400 to-purple-500 opacity-80" />
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-500">
              SKILL LENS // DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white shadow-lg shadow-cyan-950/30">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.fullName || user?.username}</p>
                <p className="text-xs text-slate-500">@{user?.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        {/* Welcome Section */}
        <section className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
              {user?.fullName?.split(' ')[0] || user?.username}
            </span>
          </h1>
          <p className="mt-3 max-w-lg text-base text-slate-400">
            Continue your coding journey. Pick up where you left off or explore new challenges.
          </p>
        </section>

        {/* Stats Grid */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Trophy,
              label: 'Problems Solved',
              value: '0',
              color: 'from-amber-400 to-orange-500',
              shadow: 'shadow-amber-950/30',
            },
            {
              icon: Flame,
              label: 'Current Streak',
              value: '0 days',
              color: 'from-rose-400 to-pink-500',
              shadow: 'shadow-rose-950/30',
            },
            {
              icon: Target,
              label: 'Skill Level',
              value: 'Beginner',
              color: 'from-violet-400 to-purple-500',
              shadow: 'shadow-violet-950/30',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-950/50 p-6 backdrop-blur-xl transition hover:border-white/[0.12] hover:bg-slate-950/60"
            >
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="relative">
                <div
                  className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${stat.color} p-2.5 shadow-lg ${stat.shadow}`}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="mb-6 text-lg font-semibold text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Button variant="primary" className="gap-2" onClick={() => navigate({ to: '/editor' })}>
              <Code2 className="h-4 w-4" />
              Start Practice
            </Button>
            <Button variant="secondary" className="gap-2">
              <BookOpen className="h-4 w-4" />
              View Problems
            </Button>
            <Button variant="secondary" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Ask AI Mentor
            </Button>
          </div>
        </section>

        {/* Account Info Card */}
        <section>
          <h2 className="mb-6 text-lg font-semibold text-white">Account Info</h2>
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/50 p-6 backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                { label: 'Full Name', value: user?.fullName },
                { label: 'Username', value: `@${user?.username}` },
                { label: 'Email', value: user?.email },
                { label: 'Account ID', value: user?.id?.slice(0, 12) + '...' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
