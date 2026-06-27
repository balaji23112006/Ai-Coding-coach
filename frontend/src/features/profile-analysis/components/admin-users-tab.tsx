import { useState, useEffect } from 'react';
import { Search, ShieldAlert, Check, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminUsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async (query = '') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchUsers(search);
  };

  const handleMakeAdmin = async (userId: string) => {
    setActionLoading(userId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/make-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to promote user to admin');
      }
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        // Update user locally
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: 'admin' } : u))
        );
      }
    } catch (error: any) {
      console.error('Error promoting user:', error);
      setMessage({ type: 'error', text: error.message || 'Promotion failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 text-white shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-white font-sans antialiased">
            <User className="h-5 w-5 text-violet-400" /> Users Directory & Management
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            View all users, search by name/email, and grant admin roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#09090b]/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold transition hover:bg-violet-500 disabled:opacity-50"
            >
              Search
            </button>
          </form>

          {/* Feedback message */}
          {message && (
            <div
              className={cn(
                'rounded-xl border p-4 text-xs font-semibold flex items-center gap-2',
                message.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              )}
            >
              {message.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.05] bg-[#09090b]/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] bg-[#0d0d0f]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">User</th>
                  <th className="p-4">Username / Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Loading Directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-slate-500">
                      No users matched your query.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => {
                    const initials = item.fullName ? item.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
                    const isUserAdmin = item.role === 'admin';

                    return (
                      <tr key={item.id} className="text-sm transition hover:bg-white/[0.01]">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 p-0.5 overflow-hidden">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.fullName}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#121214] text-xs font-bold text-white">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-200">{item.fullName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-slate-400">{item.username}</span>
                            <span className="text-[11px] text-slate-500">{item.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              isUserAdmin
                                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                : 'bg-slate-500/10 text-slate-400'
                            )}
                          >
                            {item.role || 'user'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isUserAdmin ? (
                            <span className="text-xs font-medium text-slate-500">Already Admin</span>
                          ) : (
                            <button
                              onClick={() => handleMakeAdmin(item.id)}
                              disabled={actionLoading !== null}
                              className="rounded-lg bg-violet-600/10 border border-violet-500/25 px-3 py-1.5 text-xs font-bold text-violet-400 transition hover:bg-violet-600 hover:text-white disabled:opacity-50"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Make Admin'
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
