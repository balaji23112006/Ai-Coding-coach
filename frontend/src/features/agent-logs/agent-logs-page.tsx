import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopNavigation } from '@/components/common/top-navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await fetch('/api/ai/profile/logs')
      if (!res.ok) {
        throw new Error('Failed to load agent logs')
      }
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs || [])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  // Auto refresh every 5 seconds if toggled
  useEffect(() => {
    if (!isAutoRefresh) return
    const timer = setInterval(() => {
      void fetchLogs(true)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoRefresh])

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const query = searchQuery.toLowerCase()
    return logs.filter(
      (log) =>
        log.userId.toLowerCase().includes(query) ||
        log.id.toLowerCase().includes(query) ||
        log.trigger.toLowerCase().includes(query)
    )
  }, [logs, searchQuery])

  const toggleExpand = (id: string) => {
    setExpandedRunId(expandedRunId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100 font-sans antialiased pb-24">
      {/* Top Header */}
      <TopNavigation isDark={true} setIsDark={() => {}} activeTab="profile" />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-4 pt-32 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
              <Terminal className="w-10 h-10 text-violet-500 animate-pulse" /> AGENT LOG PORT
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
                "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5",
                isAutoRefresh
                  ? "bg-violet-600/25 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "bg-white/5 border-white/10 text-slate-400"
              )}
            >
              <Activity className={cn("w-3.5 h-3.5", isAutoRefresh && "animate-pulse")} />
              {isAutoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => void fetchLogs()}
              disabled={isLoading}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all disabled:opacity-50 flex items-center justify-center"
              title="Refresh logs"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
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
            className="w-full bg-[#121214]/60 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-500 shadow-xl"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center gap-2.5 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Chronological Log Timeline */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#121214]/40 p-12 text-center">
              <p className="text-base font-bold text-slate-400">No agent execution logs found.</p>
              <p className="text-xs text-slate-500 mt-1">Traces will appear here once the Profile Agent completes a run.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedRunId === log.id
              const dateStr = new Date(log.timestamp).toLocaleTimeString()
              const fullDateStr = new Date(log.timestamp).toLocaleDateString()
              
              return (
                <Card
                  key={log.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-300 backdrop-blur-xl overflow-hidden shadow-lg",
                    isExpanded
                      ? "border-violet-500/35 bg-[#14121b]/80 shadow-[0_0_24px_rgba(139,92,246,0.08)]"
                      : "border-white/[0.04] bg-[#121214]/60 hover:bg-[#161618]/70 hover:border-white/[0.08]"
                  )}
                >
                  {/* Summary Card Bar */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="mt-1">
                        {log.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {log.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                        {log.status === 'running' && <Activity className="w-5 h-5 text-blue-400 animate-pulse" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400 tracking-wider">
                            {log.id.slice(0, 16)}...
                          </span>
                          <Badge className="bg-violet-950/40 text-violet-300 border-violet-500/20 py-0 text-[10px] uppercase font-bold tracking-wider">
                            {log.trigger}
                          </Badge>
                          {log.error && (
                            <Badge className="bg-rose-950/40 text-rose-300 border-rose-500/20 py-0 text-[10px] uppercase font-bold">
                              Failed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" /> User: <span className="text-slate-300 font-mono text-xs">{log.userId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {fullDateStr} {dateStr}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
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
                        <CardContent className="p-6 space-y-6">
                          
                          {/* Request Payload */}
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-blue-400" /> Input Parameters (Request)
                            </h3>
                            <pre className="p-4 rounded-xl bg-[#09090b]/80 border border-white/5 font-mono text-xs text-blue-200 overflow-x-auto">
                              {JSON.stringify(log.request, null, 2)}
                            </pre>
                          </div>

                          {/* Graph Path Nodes */}
                          <div className="space-y-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-violet-400" /> Graph Nodes Visited
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {log.nodes.map((node, index) => (
                                <div key={node} className="flex items-center gap-2">
                                  <Badge className="bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 py-1 font-mono text-xs">
                                    {node}
                                  </Badge>
                                  {index < log.nodes.length - 1 && (
                                    <span className="text-slate-600 text-xs font-bold font-mono">→</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Decision Traces */}
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-amber-400" /> Decision Engine Traces
                            </h3>
                            <div className="rounded-xl border border-white/5 bg-[#09090b]/60 overflow-hidden divide-y divide-white/5">
                              {log.decisions.length === 0 ? (
                                <p className="p-4 text-xs font-semibold text-slate-500">No decision steps recorded.</p>
                              ) : (
                                log.decisions.map((decision, index) => (
                                  <div key={index} className="p-3.5 font-mono text-[11px] text-slate-300 hover:bg-white/[0.01] transition-colors leading-relaxed">
                                    {decision}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Gemini Prompt Inspector */}
                          {log.prompts && log.prompts.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Gemini Prompts & Outputs
                              </h3>
                              <div className="space-y-4">
                                {log.prompts.map((p, idx) => (
                                  <div key={idx} className="rounded-xl border border-violet-500/10 bg-[#12101b]/60 overflow-hidden">
                                    <div className="px-4 py-2 bg-violet-950/20 border-b border-violet-500/10 flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                                        Type: {p.type}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-500">
                                        {new Date(p.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="p-4 space-y-4 text-xs">
                                      {/* Prompt */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt Sent:</p>
                                        <pre className="p-3 bg-[#09090b]/80 rounded-lg text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                                          {p.prompt.trim()}
                                        </pre>
                                      </div>
                                      {/* Response */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Model Response:</p>
                                        <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-lg text-slate-200 leading-relaxed font-semibold italic">
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
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Compiled Final State (Response)
                              </h3>
                              <pre className="p-4 rounded-xl bg-[#09090b]/80 border border-white/5 font-mono text-xs text-emerald-200 overflow-x-auto">
                                {JSON.stringify(log.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Fail error stack */}
                          {log.error && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" /> Root Error Message
                              </h3>
                              <pre className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/10 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap">
                                {log.error}
                              </pre>
                            </div>
                          )}

                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
