import { useMemo, useState } from 'react';
import { BookOpen, Clock, HardDrive, History, Lightbulb, Tags } from 'lucide-react';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { cn } from '@/lib/utils';
import type { Problem, Submission } from '../types/editor-types';

interface LeftPanelProps {
  problem: Problem;
  submissionHistory: Submission[];
  latestSubmission: Submission | null;
  stats?: unknown;
  loadSubmittedCode?: (code: string) => void;
}

type LeftTab = 'description' | 'hints' | 'submissions';

function estimateComplexity(code?: string) {
  const source = code || '';
  const loopCount = (source.match(/\b(for|while)\b/g) || []).length;
  const hasSort = /\.(sort)\s*\(|\bsort\s*\(/.test(source);
  const hasHash = /\b(Map|Set|dict|unordered_map|HashMap|set\()/i.test(source);
  const hasRecursion = /function\s+(\w+)[\s\S]*\1\s*\(|def\s+(\w+)[\s\S]*\2\s*\(/.test(source);

  if (hasSort) return { time: 'O(n log n)', space: hasHash ? 'O(n)' : 'O(1) to O(n)' };
  if (loopCount >= 2) return { time: 'O(n^2)', space: hasHash ? 'O(n)' : 'O(1)' };
  if (hasRecursion) return { time: 'Depends on recursion branching', space: 'O(recursion depth)' };
  if (loopCount === 1) return { time: 'O(n)', space: hasHash ? 'O(n)' : 'O(1)' };
  return { time: 'O(1) or input dependent', space: 'O(1)' };
}

function mentorFeedbackFor(submission: Submission) {
  if (submission.status === 'Accepted') {
    return 'Accepted. Nice work. Review the invariant and edge cases so the pattern sticks.';
  }
  if (submission.status === 'Compile Error') {
    return 'Start with the first compiler error. Check syntax, declarations, braces, indentation, and the required function signature.';
  }
  if (submission.status === 'Runtime Error') {
    return 'Dry run the smallest sample and inspect index bounds, null values, type assumptions, and division by zero.';
  }
  if (submission.status === 'Time Limit Exceeded') {
    return 'Look for repeated work inside loops. Consider storing intermediate results or reducing the search space.';
  }
  return 'Compare expected and actual output on one failing case. Find the first state value that diverges.';
}

function buildProgressiveHints(problem: Problem) {
  const hints = problem.hints.filter(Boolean);
  return [
    hints[0] || 'High-level idea: restate what the output represents, then identify the state you need to track.',
    hints[1] || 'Algorithm direction: ask whether a single scan, sorting, two pointers, a stack, or a hash map fits the input.',
    hints[2] || 'Edge cases: empty input, one item, duplicates, negative values, sorted input, and maximum constraints.',
    hints[3] || 'Complexity guidance: count nested loops and repeated lookups before optimizing.',
    hints[4] || 'Final learning hint: write pseudocode and dry run it on the first sample before changing code.',
  ];
}

export function LeftPanel({
  problem,
  submissionHistory,
  latestSubmission,
  loadSubmittedCode,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('description');
  const submissions = useMemo(
    () => (latestSubmission ? [latestSubmission, ...submissionHistory.filter(s => s.id !== latestSubmission.id)] : submissionHistory),
    [latestSubmission, submissionHistory],
  );
  const progressiveHints = useMemo(() => buildProgressiveHints(problem), [problem]);

  return (
    <div className="flex h-full flex-col overflow-hidden border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
      <div className="flex h-11 shrink-0 border-b border-slate-800/70 bg-slate-950/40">
        {(['description', 'hints', 'submissions'] as LeftTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex flex-1 items-center justify-center border-b-2 px-2 text-xs font-bold capitalize transition',
              activeTab === tab
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-200',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        {activeTab === 'description' && <DescriptionTab problem={problem} />}
        {activeTab === 'hints' && (
          <div className="space-y-3">
            {progressiveHints.map((hint, index) => (
              <div key={hint} className="rounded-lg border border-white/[0.04] bg-slate-900/30 p-3">
                <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-amber-400">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Hint {index + 1}
                </p>
                <p className="text-sm leading-6 text-slate-300">{hint}</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'submissions' && (
          <SubmissionsTab
            submissions={submissions}
            loadSubmittedCode={loadSubmittedCode}
          />
        )}
      </div>
    </div>
  );
}

function DescriptionTab({ problem }: { problem: Problem }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-300" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Problem
          </span>
          <StatusBadge tone={problem.difficulty === 'Easy' ? 'success' : problem.difficulty === 'Medium' ? 'warning' : 'danger'}>
            {problem.difficulty}
          </StatusBadge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{problem.title}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <span>Acceptance {problem.acceptance.toFixed(1)}%</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{problem.timeLimitMs || 0} ms</span>
          <span className="inline-flex items-center gap-1"><HardDrive className="h-3 w-3" />{problem.memoryLimitMb || 0} MB</span>
        </div>
      </div>

      <SectionCard title="Statement">
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{problem.description}</p>
      </SectionCard>

      <SectionCard title="Input Format">
        <p className="text-xs leading-relaxed text-slate-300">
          Inputs follow the function signature and sample test case structure for this problem.
        </p>
      </SectionCard>

      <SectionCard title="Output Format">
        <p className="text-xs leading-relaxed text-slate-300">
          Return or print the value that matches each expected output.
        </p>
      </SectionCard>

      <SectionCard title="Examples">
        <div className="space-y-3">
          {problem.examples.map(example => (
            <div key={example.id} className="rounded-lg border border-white/[0.04] bg-slate-900/30 p-3">
              <p className="font-mono text-[10px] font-bold uppercase text-slate-500">Example {example.id}</p>
              <div className="mt-2 space-y-2 font-mono text-xs text-slate-300">
                <pre className="whitespace-pre-wrap rounded bg-slate-950/60 p-2"><span className="text-blue-300">Input:</span> {example.input}</pre>
                <pre className="whitespace-pre-wrap rounded bg-slate-950/60 p-2"><span className="text-emerald-300">Output:</span> {example.output}</pre>
              </div>
              {example.explanation && (
                <p className="mt-2 border-t border-white/[0.04] pt-2 text-xs text-slate-400">{example.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Constraints">
        <ul className="list-inside list-disc space-y-2 text-xs text-slate-300">
          {problem.constraints.map(constraint => <li key={constraint}>{constraint}</li>)}
        </ul>
      </SectionCard>

      <SectionCard title="Tags">
        <div className="flex flex-wrap gap-2">
          {problem.topics.map(topic => (
            <span key={topic} className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
              <Tags className="h-3 w-3" />
              {topic}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Starter Code">
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950/80 p-3 font-mono text-xs leading-5 text-slate-300">
          {problem.templates.javascript || problem.templates.python || 'Starter code is not available for this problem.'}
        </pre>
      </SectionCard>
    </div>
  );
}

function SubmissionsTab({
  submissions,
  loadSubmittedCode,
}: {
  submissions: Submission[];
  loadSubmittedCode?: (code: string) => void;
}) {
  if (submissions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
        <History className="mb-3 h-8 w-8 opacity-50" />
        Submit code to see verdicts, performance, errors, complexity, and mentor feedback here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map(submission => {
        const complexity = estimateComplexity(submission.code);
        return (
          <div key={submission.id} className="rounded-lg border border-white/[0.04] bg-slate-900/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cn(
                  'text-sm font-bold',
                  submission.status === 'Accepted' ? 'text-emerald-400' : submission.status === 'Wrong Answer' ? 'text-amber-400' : 'text-rose-400',
                )}>
                  {submission.status}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {new Date(submission.submittedAt).toLocaleString()} - {submission.language}
                </p>
              </div>
              {loadSubmittedCode && (
                <button
                  onClick={() => loadSubmittedCode(submission.code)}
                  className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-amber-500 hover:text-amber-400"
                >
                  Load
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
              <span>Tests: {submission.passedCount ?? 0}/{submission.totalCount ?? '?'}</span>
              <span>Runtime: {submission.runtime ?? 0}ms</span>
              <span>Memory: {submission.memory ?? 0}MB</span>
              <span>Time: {complexity.time}</span>
              <span>Space: {complexity.space}</span>
            </div>

            {(submission.stderr || submission.stdout) && (
              <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-slate-950/70 p-2 font-mono text-[11px] text-slate-300">
                {submission.stderr || submission.stdout}
              </pre>
            )}

            <p className="mt-3 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs leading-5 text-slate-300">
              {mentorFeedbackFor(submission)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
