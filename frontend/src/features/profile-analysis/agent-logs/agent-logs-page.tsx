import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  RefreshCw,
  Sparkles,
  Terminal,
  User,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopNavigation } from '@/components/common/top-navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LogPrompt {
  type: string;
  prompt: string;
  response: string;
  timestamp: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  trigger: string;
  status: 'running' | 'completed' | 'failed';
  decisions: string[];
  nodes: string[];
  prompts: LogPrompt[];
  request: any;
  response: any;
  error?: string;
}

export function AgentLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/ai/profile/logs');
      if (!res.ok) {
        throw new Error('Failed to load agent logs');
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  // Auto refresh every 5 seconds if toggled
  useEffect(() => {
    if (!isAutoRefresh) return;
    const timer = setInterval(() => {
      void fetchLogs(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoRefresh]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.userId.toLowerCase().includes(query) ||
        log.id.toLowerCase().includes(query) ||
        log.trigger.toLowerCase().includes(query),
    );
  }, [logs, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedRunId(expandedRunId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] pb-24 font-sans text-slate-100 antialiased">
      {/* Top Header */}
      <TopNavigation isDark={true} setIsDark={() => {}} activeTab="profile" />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-4 pt-32 sm:px-6 lg:px-8">
        {/* Header Block */}
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-tighter text-white">
              <Terminal className="h-10 w-10 animate-pulse text-violet-500" /> AGENT LOG PORT
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-400">
              Developer console tracing requests, responses, graph paths, and Gemini decision steps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto refresh switch */}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all',
                isAutoRefresh
                  ? 'border-violet-500 bg-violet-600/25 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'border-white/10 bg-white/5 text-slate-400',
              )}
            >
              <Activity className={cn('h-3.5 w-3.5', isAutoRefresh && 'animate-pulse')} />
              {isAutoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => void fetchLogs()}
              disabled={isLoading}
              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white transition-all hover:bg-white/10 disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by User ID or Run ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#121214]/60 px-5 py-3.5 text-sm text-white shadow-xl transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/15 p-4 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Chronological Log Timeline */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214]/40 p-12 text-center">
              <p className="text-base font-bold text-slate-400">No agent execution logs found.</p>
              <p className="mt-1 text-xs text-slate-500">
                Traces will appear here once the Profile Agent completes a run.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedRunId === log.id;
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              const fullDateStr = new Date(log.timestamp).toLocaleDateString();

              return (
                <Card
                  key={log.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border shadow-lg backdrop-blur-xl transition-all duration-300',
                    isExpanded
                      ? 'border-violet-500/35 bg-[#14121b]/80 shadow-[0_0_24px_rgba(139,92,246,0.08)]'
                      : 'border-white/[0.04] bg-[#121214]/60 hover:border-white/[0.08] hover:bg-[#161618]/70',
                  )}
                >
                  {/* Summary Card Bar */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex cursor-pointer select-none flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="mt-1">
                        {log.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        )}
                        {log.status === 'failed' && <XCircle className="h-5 w-5 text-rose-400" />}
                        {log.status === 'running' && (
                          <Activity className="h-5 w-5 animate-pulse text-blue-400" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider text-slate-400">
                            {log.id.slice(0, 16)}...
                          </span>
                          <Badge className="border-violet-500/20 bg-violet-950/40 py-0 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                            {log.trigger}
                          </Badge>
                          {log.error && (
                            <Badge className="border-rose-500/20 bg-rose-950/40 py-0 text-[10px] font-bold uppercase text-rose-300">
                              Failed
                            </Badge>
                          )}
                        </div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <User className="h-3.5 w-3.5 text-slate-500" /> User:{' '}
                          <span className="font-mono text-xs text-slate-300">{log.userId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Clock className="h-3.5 w-3.5" /> {fullDateStr} {dateStr}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-white/[0.06] bg-[#0c0a13]/40"
                      >
                        <CardContent className="space-y-6 p-6">
                          {/* Request Payload */}
                          <div className="space-y-2">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                              <Cpu className="h-3.5 w-3.5 text-blue-400" /> Input Parameters
                              (Request)
                            </h3>
                            <pre className="overflow-x-auto rounded-xl border border-white/5 bg-[#09090b]/80 p-4 font-mono text-xs text-blue-200">
                              {JSON.stringify(log.request, null, 2)}
                            </pre>
                          </div>

                          {/* Graph Path Nodes */}
                          <div className="space-y-2.5">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                              <Activity className="h-3.5 w-3.5 text-violet-400" /> Graph Nodes
                              Visited
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {log.nodes.map((node, index) => (
                                <div key={node} className="flex items-center gap-2">
                                  <Badge className="border-white/10 bg-white/5 py-1 font-mono text-xs text-slate-200 hover:bg-white/10">
                                    {node}
                                  </Badge>
                                  {index < log.nodes.length - 1 && (
                                    <span className="font-mono text-xs font-bold text-slate-600">
                                      →
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Decision Traces */}
                          <div className="space-y-2">
                            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                              <Database className="h-3.5 w-3.5 text-amber-400" /> Decision Engine
                              Traces
                            </h3>
                            <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-[#09090b]/60">
                              {log.decisions.length === 0 ? (
                                <p className="p-4 text-xs font-semibold text-slate-500">
                                  No decision steps recorded.
                                </p>
                              ) : (
                                log.decisions.map((decision, index) => (
                                  <div
                                    key={index}
                                    className="p-3.5 font-mono text-[11px] leading-relaxed text-slate-300 transition-colors hover:bg-white/[0.01]"
                                  >
                                    {decision}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Gemini Prompt Inspector */}
                          {log.prompts && log.prompts.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <Sparkles className="h-3.5 w-3.5 text-yellow-400" /> Gemini Prompts
                                & Outputs
                              </h3>
                              <div className="space-y-4">
                                {log.prompts.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="overflow-hidden rounded-xl border border-violet-500/10 bg-[#12101b]/60"
                                  >
                                    <div className="flex items-center justify-between border-b border-violet-500/10 bg-violet-950/20 px-4 py-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                                        Type: {p.type}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-500">
                                        {new Date(p.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="space-y-4 p-4 text-xs">
                                      {/* Prompt */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                          Prompt Sent:
                                        </p>
                                        <pre className="whitespace-pre-wrap rounded-lg bg-[#09090b]/80 p-3 font-mono leading-relaxed text-slate-400">
                                          {p.prompt.trim()}
                                        </pre>
                                      </div>
                                      {/* Response */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                                          Model Response:
                                        </p>
                                        <div className="rounded-lg border border-violet-500/10 bg-violet-950/20 p-3 font-semibold italic leading-relaxed text-slate-200">
                                          {p.response}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Response Payload */}
                          {log.response && (
                            <div className="space-y-2">
                              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Compiled
                                Final State (Response)
                              </h3>
                              <pre className="overflow-x-auto rounded-xl border border-white/5 bg-[#09090b]/80 p-4 font-mono text-xs text-emerald-200">
                                {JSON.stringify(log.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Fail error stack */}
                          {log.error && (
                            <div className="space-y-2">
                              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                                <XCircle className="h-3.5 w-3.5" /> Root Error Message
                              </h3>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-rose-500/10 bg-rose-950/15 p-4 font-mono text-xs text-rose-300">
                                {log.error}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
