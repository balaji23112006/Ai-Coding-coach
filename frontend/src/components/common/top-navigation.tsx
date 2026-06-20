import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  LogOut,
  Map as MapIcon,
  Moon,
  Sun,
  User,
  LayoutDashboard,
  Code2,
  Target,
  Trophy,
  Terminal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/features/authentication';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' as const },
  { label: 'Practice', icon: Code2, to: '/practice' as const },
  { label: 'Roadmap', icon: MapIcon, to: '/roadmap' as const },
  { label: 'Progress', icon: Target, to: '/progress' as const },
  { label: 'Leaderboard', icon: Trophy, to: '/leaderboard' as const },
];

interface TopNavigationProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  activeTab: string;
}

export function TopNavigation({ isDark, setIsDark, activeTab }: TopNavigationProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    void navigate({ to: '/auth/login' });
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-500',
        scrolled ? 'shadow-md' : '',
        isDark
          ? 'border-white/[0.04] bg-[#09090b]/80'
          : 'border-violet-600/20 bg-violet-600/90 text-white shadow-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link className="flex shrink-0 items-center gap-3" to="/dashboard">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-transform hover:scale-105',
              isDark ? 'bg-violet-600 text-white' : 'bg-white text-violet-600',
            )}
          >
            <MapIcon className="h-4 w-4" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">
            Skill Lens
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav
          className={cn(
            'hidden items-center gap-1 rounded-full border p-1 shadow-sm transition-colors xl:flex',
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-white/10 bg-black/10',
          )}
        >
          {navItems.map((item) => {
            const isActive = item.label.toLowerCase() === activeTab.toLowerCase();
            const className = cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300',
              isActive
                ? isDark
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'bg-white/20 text-white shadow-sm'
                : cn(
                    'hover:-translate-y-0.5',
                    isDark
                      ? 'text-slate-500 hover:text-violet-200 hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                      : 'text-violet-100 hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_rgba(255,255,255,0.25)]',
                  ),
            );

            return (
              <Link className={className} key={item.label} to={item.to}>
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Global Controls & Dropdown */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <button
            aria-label="Notifications"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full outline-none transition',
              isDark
                ? 'bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white'
                : 'bg-transparent text-violet-100 hover:bg-white/10 hover:text-white',
            )}
            type="button"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            aria-label="Toggle Theme"
            onClick={() => setIsDark(!isDark)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full outline-none transition',
              isDark
                ? 'bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white'
                : 'bg-transparent text-violet-100 hover:bg-white/10 hover:text-white',
            )}
            type="button"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Profile Dropdown Menu */}
          <div className="relative ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 outline-none transition',
                    isDark
                      ? 'border-white/[0.05] bg-[#161618] hover:bg-white/[0.05]'
                      : 'border-white/10 bg-black/10 text-white hover:bg-black/20',
                  )}
                  type="button"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold',
                      isDark ? 'bg-violet-600 text-white' : 'bg-white text-violet-600',
                    )}
                  >
                    {userInitials}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-300',
                      isDark ? 'text-slate-400' : 'text-violet-200',
                    )}
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className={cn(
                  'z-50 w-48 rounded-xl border p-1.5 shadow-xl',
                  isDark
                    ? 'border-white/[0.05] bg-[#121214] text-slate-100'
                    : 'border-slate-200 bg-white text-slate-900',
                )}
              >
                <DropdownMenuItem asChild>
                  <Link
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                    to="/profile"
                  >
                    <User className="h-3.5 w-3.5 text-violet-500" /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                    to="/agent-logs"
                  >
                    <Terminal className="h-3.5 w-3.5 text-violet-500" /> Agent Logs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={isDark ? 'bg-white/[0.04]' : 'bg-slate-100'} />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
