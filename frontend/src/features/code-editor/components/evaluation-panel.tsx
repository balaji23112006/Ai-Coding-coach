import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
  Sparkles,
} from 'lucide-react';

interface TraceNode {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error';
  duration: number | null;
}

const INITIAL_NODES: TraceNode[] = [
  { id: 'executeCode', name: 'Execute Code', status: 'pending', duration: null },
  { id: 'runTests', name: 'Run Test Cases', status: 'pending', duration: null },
  { id: 'detectBugs', name: 'Detect Bugs', status: 'pending', duration: null },
  { id: 'analyzeComplexity', name: 'Analyze Complexity', status: 'pending', duration: null },
  { id: 'reviewCode', name: 'Review Code Quality', status: 'pending', duration: null },
  { id: 'computeScore', name: 'Compute Evaluation Score', status: 'pending', duration: null },
  { id: 'classifyVerdict', name: 'Classify Verdict', status: 'pending', duration: null },
  { id: 'generateFeedback', name: 'Generate Feedback', status: 'pending', duration: null },
  { id: 'saveEvalResult', name: 'Save Evaluation Result', status: 'pending', duration: null },
];

interface EvaluationPanelProps {
  problemId: string;
  submittedCode: string;
  testCases: Array<{ input: string; expected_output: string }>;
  userId: string;
  language: string;
  onClose: () => void;
  isEvaluating: boolean;
  setIsEvaluating: (val: boolean) => void;
}

export function EvaluationPanel({
  problemId,
  submittedCode,
  testCases,
  userId,
  language,
  onClose,
  isEvaluating,
  setIsEvaluating,
}: EvaluationPanelProps) {
  const [nodes, setNodes] = useState<TraceNode[]>(INITIAL_NODES);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Collapsible section states
  const [collapseTests, setCollapseTests] = useState(false);
  const [collapseComplexity, setCollapseComplexity] = useState(false);
  const [collapseQuality, setCollapseQuality] = useState(false);
  const [collapseFeedback, setCollapseFeedback] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Trigger evaluation
  useEffect(() => {
    let active = true;

    // Reset nodes state
    setNodes(INITIAL_NODES.map((n, i) => (i === 0 ? { ...n, status: 'running' } : n)));
    setResult(null);
    setError(null);
    setIsEvaluating(true);

    // Setup WebSockets to listen on 8001
    const ws = new WebSocket('ws://localhost:8001');
    wsRef.current = ws;
    let evalStarted = false;

    const triggerEvalOnce = () => {
      if (evalStarted) return;
      evalStarted = true;
      void triggerEval();
    };

    ws.onopen = () => {
      if (!active) return;
      triggerEvalOnce();
    };

    ws.onmessage = (event) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'node_complete') {
          setNodes((prev) => {
            const nextNodes = prev.map((n) => {
              if (n.id === data.node) {
                return {
                  ...n,
                  status: data.status,
                  duration: data.duration_ms,
                };
              }
              return n;
            });

            // Set the next pending node as 'running'

            let firstPendingIndex = nextNodes.findIndex(
              (n) => n.status === 'pending' || n.status === 'running'
            );

            if (firstPendingIndex !== -1) {
              return nextNodes.map((n, idx) => {
                if (idx === firstPendingIndex) {
                  return { ...n, status: 'running' as const };
                }
                return n;
              });
            }

            return nextNodes;
          });
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onerror = (err) => {
      if (!active) return;
      console.warn('WS connection error, will rely on REST API fallback for final state', err);
      triggerEvalOnce();
    };

    const safetyTimeout = setTimeout(() => {
      if (!active) return;
      triggerEvalOnce();
    }, 500);

    // Call REST API
    async function triggerEval() {
      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            problemId,
            submittedCode,
            testCases: testCases.map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expected_output,
            })),
            trigger: 'submit',
            language,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Evaluation failed');
        }

        const data = await response.json();
        if (!active) return;

        setResult(data);

        // Fill all remaining trace nodes as completed
        setNodes((prev) =>
          prev.map((n) => {
            if (n.status === 'pending' || n.status === 'running') {
              return { ...n, status: 'done', duration: n.duration || 10 };
            }
            return n;
          })
        );
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'An error occurred during evaluation');
        setNodes((prev) =>
          prev.map((n) => (n.status === 'running' ? { ...n, status: 'error' } : n))
        );
      } finally {
        if (active) {
          setIsEvaluating(false);
          if (wsRef.current) {
            const wsToClose = wsRef.current;
            wsToClose.onopen = null;
            wsToClose.onmessage = null;
            wsToClose.onerror = null;
            if (wsToClose.readyState === WebSocket.OPEN) {
              wsToClose.close();
            } else if (wsToClose.readyState === WebSocket.CONNECTING) {
              wsToClose.onopen = () => wsToClose.close();
            }
          }
        }
      }
    }

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      if (wsRef.current) {
        const wsToClose = wsRef.current;
        wsToClose.onopen = null;
        wsToClose.onmessage = null;
        wsToClose.onerror = null;
        if (wsToClose.readyState === WebSocket.OPEN) {
          wsToClose.close();
        } else if (wsToClose.readyState === WebSocket.CONNECTING) {
          wsToClose.onopen = () => wsToClose.close();
        }
      }
    };
  }, [problemId, submittedCode, userId, language]);

  // Animated circular score offset computation
  const score = result?.evalScore || 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const [strokeOffset, setStrokeOffset] = useState(circumference);

  useEffect(() => {
    if (!isEvaluating && result) {
      const timer = setTimeout(() => {
        const progress = score / 100;
        setStrokeOffset(circumference * (1 - progress));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setStrokeOffset(circumference);
    }
  }, [isEvaluating, result, score, circumference]);

  // Color helper based on verdict
  const getVerdictTheme = () => {
    if (isEvaluating) return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' };
    const verdict = result?.verdict;
    if (verdict === 'Pass') {
      return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-950/20', stroke: '#10B981' };
    }
    if (verdict === 'Partial Pass') {
      return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-950/20', stroke: '#F59E0B' };
    }
    return { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-950/20', stroke: '#F43F5E' };
  };

  const theme = getVerdictTheme();

  return (
    <div className="flex h-full flex-col border-l border-[#30363D] bg-[#0D1117] text-slate-200 antialiased font-sans">
      {/* Sidebar Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#30363D] px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#6C63FF]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Agentic Evaluation
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEvaluating && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">Evaluating...</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-[#161B22] hover:text-white transition"
          >
            <span className="text-xs font-bold font-mono">✖</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 text-xs text-rose-300 flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Evaluation Interrupted</p>
              <p className="mt-1 text-slate-400 font-mono leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Verdict Card */}
        {(!isEvaluating || result) && !error && result && (
          <div className={`rounded-xl border ${theme.border} ${theme.bg} p-4 flex items-center justify-between`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Evaluation Verdict
              </span>
              <h2 className={`text-xl font-black ${theme.text} tracking-tight mt-0.5`}>
                {result.verdict}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-1.5">
                {result.testResults?.passed}/{result.testResults?.total} testsPassed
                {result.complexity?.timeComplexity && ` · ${result.complexity.timeComplexity}`}
              </p>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={theme.stroke || '#6C63FF'}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-black tracking-tight">{score}</span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Score</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Agent Trace Graph */}
        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Execution Trace pipeline
          </h3>
          <div className="space-y-2.5">
            {nodes.map((node) => {
              const isRunning = node.status === 'running';
              const isDone = node.status === 'done';
              const isSkipped = node.status === 'skipped';
              const isErr = node.status === 'error';

              let statusColor = 'text-slate-600';
              let statusText = 'Pending';
              let dotClass = 'bg-slate-700';

              if (isRunning) {
                statusColor = 'text-indigo-400 font-bold';
                statusText = 'Executing...';
                dotClass = 'bg-indigo-500 animate-pulse ring-4 ring-indigo-900/35';
              } else if (isDone) {
                statusColor = 'text-emerald-400';
                statusText = node.duration !== null ? `${node.duration}ms` : 'Complete';
                dotClass = 'bg-emerald-500';
              } else if (isSkipped) {
                statusColor = 'text-slate-500 line-through';
                statusText = 'Skipped';
                dotClass = 'bg-slate-800 border border-slate-700';
              } else if (isErr) {
                statusColor = 'text-rose-400 font-bold';
                statusText = 'Error';
                dotClass = 'bg-rose-500';
              }

              return (
                <div key={node.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${dotClass} shrink-0`} />
                    <span className={isSkipped ? 'text-slate-500 line-through' : 'text-slate-300'}>
                      {node.name}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] ${statusColor}`}>{statusText}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Test Cases (Collapsible) */}
        {(!isEvaluating || result) && result && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
            <button
              onClick={() => setCollapseTests(!collapseTests)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1C2333]/30 border-b border-[#30363D]/60 hover:bg-[#1C2333]/50 transition"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Test Cases</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  {result.testResults?.passed}/{result.testResults?.total} Passed
                </span>
              </div>
              {collapseTests ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
            </button>

            {!collapseTests && result.bugReport?.bugs && (
              <div className="p-4 space-y-3 divide-y divide-[#30363D]/40">
                {result.testResults?.results?.map((tr: any) => (
                  <div key={tr.testCase} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400">Test Case #{tr.testCase + 1}</span>
                      {tr.passed ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1 font-mono text-[10px] bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]/40 text-slate-400">
                      <div>
                        <span className="text-slate-600">Input:</span> {tr.input}
                      </div>
                      <div>
                        <span className="text-slate-600">Expected:</span> {tr.expected}
                      </div>
                      <div className={!tr.passed ? 'text-rose-400' : ''}>
                        <span className="text-slate-600">Actual:</span> {tr.actual || 'null'}
                      </div>
                      {tr.error && (
                        <div className="text-rose-500 mt-1 font-sans">
                          <span className="font-bold">Error:</span> {tr.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Complexity Section (Collapsible) */}
        {(!isEvaluating || result) && result && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
            <button
              onClick={() => setCollapseComplexity(!collapseComplexity)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1C2333]/30 border-b border-[#30363D]/60 hover:bg-[#1C2333]/50 transition"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Complexity Analysis</span>
              </div>
              {collapseComplexity ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
            </button>

            {!collapseComplexity && result.complexity && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1C2333]/45 border border-[#30363D]/50 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Time Complexity</span>
                    <p className="text-lg font-black text-[#6C63FF] mt-1 font-mono">
                      {result.complexity.timeComplexity}
                    </p>
                  </div>
                  <div className="bg-[#1C2333]/45 border border-[#30363D]/50 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Space Complexity</span>
                    <p className="text-lg font-black text-[#6C63FF] mt-1 font-mono">
                      {result.complexity.spaceComplexity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]/40">
                  <span className="text-[11px] text-slate-400">Optimal Solution Status</span>
                  {result.complexity.isOptimal ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      ✓ Optimal
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                      ⚠️ Sub-optimal
                    </span>
                  )}
                </div>

                {result.complexity.suggestion && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-[11px] leading-relaxed text-amber-300">
                    {result.complexity.suggestion}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Code Quality (Collapsible) */}
        {(!isEvaluating || result) && result && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
            <button
              onClick={() => setCollapseQuality(!collapseQuality)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1C2333]/30 border-b border-[#30363D]/60 hover:bg-[#1C2333]/50 transition"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#6C63FF]" />
                <span className="text-xs font-bold text-slate-300">Code Quality</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  {result.qualityGrade}
                </span>
              </div>
              {collapseQuality ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
            </button>

            {!collapseQuality && (
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Quality Score</span>
                    <span className="font-bold font-mono">{result.qualityScore}/100</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-[#6C63FF] transition-all duration-1000 ease-out"
                      style={{ width: `${result.qualityScore}%` }}
                    />
                  </div>
                </div>

                {result.bugReport?.bugs && (
                  <ul className="space-y-2 text-xs mt-2 list-disc list-inside text-slate-300">
                    {result.bugReport.bugs
                      .filter((b: any) => b.type === 'static_warning')
                      .map((b: any, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="font-bold text-amber-400">{b.message}</span>: {b.hint}
                        </li>
                      ))}
                    {result.bugReport.bugs.filter((b: any) => b.type === 'static_warning').length === 0 && (
                      <li className="list-none text-slate-500 text-center italic py-2">
                        No code quality issues identified.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. Feedback (Collapsible) */}
        {(!isEvaluating || result) && result && result.feedback && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
            <button
              onClick={() => setCollapseFeedback(!collapseFeedback)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1C2333]/30 border-b border-[#30363D]/60 hover:bg-[#1C2333]/50 transition"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Coach Feedback</span>
              </div>
              {collapseFeedback ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
            </button>

            {!collapseFeedback && (
              <div className="p-4 space-y-2.5">
                {result.feedback.map((item: string, idx: number) => {
                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-[#0D1117] border border-[#30363D]/50 p-3 text-xs leading-relaxed text-slate-300 flex gap-2.5"
                    >
                      <div className="mt-0.5 text-base shrink-0 select-none">
                        {item.startsWith('✅')
                          ? '✅'
                          : item.startsWith('⚠️')
                            ? '⚠️'
                            : item.startsWith('⚡')
                              ? '⚡'
                              : item.startsWith('✍️')
                                ? '✍️'
                                : '💡'}
                      </div>
                      <div>
                        {item.replace(/^(✅|⚠️|⚡|✍️|💡)\s*/, '')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Skeletons Shimmers during loading */}
        {isEvaluating && !result && (
          <div className="space-y-4">
            {/* Shimmer 1 */}
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4 h-16 animate-pulse flex items-center justify-between">
              <div className="h-3 w-1/3 bg-slate-800 rounded" />
              <div className="h-10 w-10 bg-slate-800 rounded-full" />
            </div>
            {/* Shimmer 2 */}
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4 h-32 animate-pulse space-y-2.5">
              <div className="h-3.5 w-1/2 bg-slate-800 rounded" />
              <div className="h-2 w-full bg-slate-800 rounded" />
              <div className="h-2 w-full bg-slate-800 rounded" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default EvaluationPanel;
