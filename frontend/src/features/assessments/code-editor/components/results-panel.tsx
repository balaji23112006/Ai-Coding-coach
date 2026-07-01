import {
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  X,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ExecutionResult, Submission, Problem } from '../types/editor-types';

interface ResultsPanelProps {
  type: 'run' | 'submit';
  result: ExecutionResult | Submission | null;
  isLoading: boolean;
  onClose?: () => void;
  examples?: Problem['examples'];
  benchmark?: {
    runtimeMs: number;
    memoryMb: number;
  };
  submissionHistory?: Submission[];
}

type ComplexityEstimate = {
  time: string;
  space: string;
  algorithm: string;
};

const chartConfig = {
  value: { label: 'Value', color: '#f59e0b' },
  target: { label: 'Target', color: '#64748b' },
  passed: { label: 'Passed', color: '#22c55e' },
  failed: { label: 'Failed', color: '#ef4444' },
  runtime: { label: 'Runtime', color: '#38bdf8' },
};

function getStatus(result: ExecutionResult | Submission, type: 'run' | 'submit') {
  return type === 'run' ? (result as ExecutionResult).status : (result as Submission).status;
}

function getRuntime(result: ExecutionResult | Submission) {
  return result.runtime ?? 0;
}

function getMemory(result: ExecutionResult | Submission) {
  return result.memory ?? 0;
}

function estimateComplexity(code: string | undefined): ComplexityEstimate {
  const source = code || '';
  const loopCount = (source.match(/\b(for|while)\b/g) || []).length;
  const hasSort = /\.(sort)\s*\(|\bsort\s*\(/.test(source);
  const hasHash = /\b(Map|Set|dict|unordered_map|HashMap|set\()/i.test(source);
  const hasRecursion = /function\s+(\w+)[\s\S]*\1\s*\(|def\s+(\w+)[\s\S]*\2\s*\(/.test(source);

  if (hasSort)
    return {
      time: 'O(n log n)',
      space: hasHash ? 'O(n)' : 'O(1) to O(n)',
      algorithm: 'Sorting / ordering',
    };
  if (loopCount >= 2)
    return { time: 'O(n^2)', space: hasHash ? 'O(n)' : 'O(1)', algorithm: 'Nested iteration' };
  if (hasRecursion)
    return { time: 'Depends on branching', space: 'O(depth)', algorithm: 'Recursion' };
  if (loopCount === 1)
    return {
      time: 'O(n)',
      space: hasHash ? 'O(n)' : 'O(1)',
      algorithm: hasHash ? 'Hash based scan' : 'Linear scan',
    };
  return { time: 'O(1) or input dependent', space: 'O(1)', algorithm: 'Direct computation' };
}

function buildMentorHint(status: string, type: 'run' | 'submit') {
  if (status === 'Compile Error') {
    return [
      'Read the first compiler error before the rest; later errors often come from the same root issue.',
      'Check declarations, braces, indentation, imports, and function names against the starter signature.',
    ];
  }
  if (status === 'Runtime Error') {
    return [
      'Dry run the smallest sample and watch for null, undefined, index bounds, division, or type assumptions.',
      'Add one temporary print near the line that fails, then remove it once the cause is clear.',
    ];
  }
  if (status === 'Wrong Answer') {
    return [
      'Compare expected vs. actual output and ask which rule your code handled differently.',
      'Try edge cases: empty input, one item, duplicates, negative values, and already sorted data.',
    ];
  }
  if (status === 'Time Limit Exceeded') {
    return [
      'Look for repeated work inside loops; that is usually where TLE begins.',
      'Ask whether a map, set, sorting step, or binary search could reduce repeated scanning.',
    ];
  }
  return type === 'run'
    ? ['Nice: the visible samples pass. Before submitting, think about hidden edge cases.']
    : ['Accepted. Review why the approach works so you can reuse the pattern next time.'];
}

function scoreQuality(
  status: string,
  passed?: number,
  total?: number,
  runtime = 0,
  targetRuntime = 2000,
) {
  const passRatio = total ? passed || 0 : status === 'Accepted' || status === 'Success' ? 1 : 0;
  const passScore = total ? (passRatio / total) * 70 : passRatio * 70;
  const runtimeScore = runtime > 0 ? Math.max(0, 20 - (runtime / targetRuntime) * 20) : 10;
  const statusBonus = status === 'Accepted' || status === 'Success' ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(passScore + runtimeScore + statusBonus)));
}

export function ResultsPanel({
  type,
  result,
  isLoading,
  onClose,
  examples = [],
  benchmark = { runtimeMs: 2000, memoryMb: 256 },
  submissionHistory = [],
}: ResultsPanelProps) {
  if (!result && !isLoading) return null;

  const isRunResult = type === 'run';
  const statusColors: Record<string, string> = {
    Success: 'text-green-400 bg-green-500/10',
    Accepted: 'text-green-400 bg-green-500/10',
    'Compile Error': 'text-red-400 bg-red-500/10',
    'Runtime Error': 'text-orange-400 bg-orange-500/10',
    'Wrong Answer': 'text-yellow-400 bg-yellow-500/10',
    'Time Limit Exceeded': 'text-purple-400 bg-purple-500/10',
  };

  const statusIcons: Record<string, LucideIcon> = {
    Success: CheckCircle2,
    Accepted: CheckCircle2,
    'Compile Error': AlertCircle,
    'Runtime Error': AlertCircle,
    'Wrong Answer': AlertCircle,
    'Time Limit Exceeded': AlertCircle,
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-amber-500"></div>
          <p className="text-sm text-slate-400">
            {type === 'run' ? 'Running...' : 'Submitting...'}
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const status = getStatus(result, type);
  const statusColor = statusColors[status] || 'text-slate-400 bg-slate-500/10';
  const StatusIcon = statusIcons[status] || AlertCircle;
  const runtime = getRuntime(result);
  const memory = getMemory(result);
  const passedCount = 'passedCount' in result ? result.passedCount : undefined;
  const totalCount = 'totalCount' in result ? result.totalCount : undefined;
  const failedCount = totalCount !== undefined ? Math.max(0, totalCount - (passedCount ?? 0)) : 0;
  const code = isRunResult ? undefined : (result as Submission).code;
  const complexity = estimateComplexity(code);
  const hints = buildMentorHint(status, type);
  const qualityScore = scoreQuality(status, passedCount, totalCount, runtime, benchmark.runtimeMs);
  const passedLabel = totalCount
    ? `${passedCount ?? 0} / ${totalCount}`
    : status === 'Accepted' || status === 'Success'
      ? 'Visible checks passed'
      : 'Not available';
  const compilationLabel = status === 'Compile Error' ? 'Failed' : 'Success';
  const chartHistory = submissionHistory
    .slice(0, 8)
    .reverse()
    .map((submission, index) => ({
      name: `#${index + 1}`,
      runtime: submission.runtime ?? 0,
    }));
  const performanceData = [
    { name: 'Runtime', value: runtime, target: benchmark.runtimeMs },
    { name: 'Memory', value: memory, target: benchmark.memoryMb },
  ];
  const passData = [
    { name: 'Passed', value: passedCount ?? 0, fill: '#22c55e' },
    { name: 'Failed', value: failedCount, fill: '#ef4444' },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusColor.split(' ')[0]}`} />
          <span className={`text-sm font-semibold ${statusColor.split(' ')[0]}`}>{status}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-800/30">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Content */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
            {type === 'run' ? 'Run Code Report' : 'Submission Result'}
          </div>
          <div className="space-y-1.5 text-sm text-slate-300">
            <p>
              <span className={compilationLabel === 'Success' ? 'text-green-400' : 'text-red-400'}>
                {compilationLabel === 'Success' ? 'Compilation: Success' : 'Compilation Failed'}
              </span>
            </p>
            <p>
              Status: <span className={statusColor.split(' ')[0]}>{status}</span>
            </p>
            <p>
              Test Cases: <span className="font-semibold text-slate-100">{passedLabel}</span>
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-slate-700/30 bg-slate-900/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Runtime
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-200">{runtime}ms</p>
          </div>
          <div className="rounded border border-slate-700/30 bg-slate-900/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <HardDrive className="h-3.5 w-3.5" />
              Memory
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-200">{memory}MB</p>
          </div>
        </div>

        {type === 'run' && examples.length > 0 && (
          <section className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Sample Test Cases
            </div>
            <div className="space-y-2">
              {examples.slice(0, 2).map((example) => (
                <div
                  key={example.id}
                  className="rounded border border-slate-800/60 bg-slate-950/30 p-2 text-xs"
                >
                  <p className="text-slate-500">Input</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-slate-300">
                    {example.input}
                  </pre>
                  <p className="mt-1 text-slate-500">Expected Output</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-slate-300">
                    {example.output}
                  </pre>
                  <p
                    className={
                      status === 'Success' ? 'mt-1 text-green-400' : 'mt-1 text-yellow-400'
                    }
                  >
                    Status: {status === 'Success' ? 'Passed' : 'Check output below'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {type === 'submit' && (
          <section className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Performance Analysis
            </div>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>
                Time Complexity:{' '}
                <span className="font-semibold text-slate-100">{complexity.time}</span>
              </p>
              <p>
                Space Complexity:{' '}
                <span className="font-semibold text-slate-100">{complexity.space}</span>
              </p>
              <p>
                Algorithm Used:{' '}
                <span className="font-semibold text-slate-100">{complexity.algorithm}</span>
              </p>
              <p>
                Code Quality:{' '}
                <span className="font-semibold text-amber-400">{qualityScore}/100</span>
              </p>
            </div>
          </section>
        )}

        {type === 'submit' && (
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Runtime / Memory
                </div>
                <ChartContainer config={chartConfig} className="aspect-auto h-36">
                  <BarChart data={performanceData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="target" fill="var(--color-target)" radius={3} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={3} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                  <PieChartIcon className="h-3.5 w-3.5" />
                  Passed / Failed
                </div>
                {passData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="aspect-auto h-36">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={passData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={28}
                        outerRadius={48}
                      >
                        {passData.map((item) => (
                          <Cell key={item.name} fill={item.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-36 items-center justify-center text-xs text-slate-500">
                    No test count available
                  </div>
                )}
              </div>
            </div>

            <div className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <LineChartIcon className="h-3.5 w-3.5" />
                Submission Runtime Trend
              </div>
              {chartHistory.length > 1 ? (
                <ChartContainer config={chartConfig} className="aspect-auto h-32">
                  <LineChart data={chartHistory}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="runtime"
                      stroke="var(--color-runtime)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                  Submit more attempts to see a trend
                </div>
              )}
              {/* Memory Trend */}
              {chartHistory.length > 1 && (
                <ChartContainer config={chartConfig} className="aspect-auto h-32">
                  <LineChart data={chartHistory}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="var(--color-memory)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </section>
        )}

        {((result as ExecutionResult).stdout || (result as Submission).stdout) && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Output</div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-700/30 bg-slate-900/40 p-3 font-mono text-xs text-slate-300">
              {isRunResult
                ? (result as ExecutionResult).stdout
                : (result as Submission).stdout || 'No output'}
            </pre>
          </div>
        )}

        {((result as ExecutionResult).stderr || (result as Submission).stderr) && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-red-400">Errors</div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border border-red-700/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">
              {isRunResult ? (result as ExecutionResult).stderr : (result as Submission).stderr}
            </pre>
          </div>
        )}

        <section className="rounded border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-amber-400">Mentor Hint</div>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {hints.map((hint) => (
              <li key={hint}>- {hint}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Footer with Action */}
      <div className="border-t border-slate-800/40 bg-slate-950/20 px-4 py-2">
        <p className="text-center text-xs text-slate-500">
          {type === 'run'
            ? 'Use this to debug. Submit only after checking edge cases.'
            : 'Submitted. Review the analysis before your next attempt.'}
        </p>
      </div>
    </div>
  );
}
