import { BookOpen, Lightbulb } from 'lucide-react';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import type { Problem } from '../types/editor-types';

interface ProblemPanelProps {
  problem: Problem;
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  return (
    <div className="custom-scrollbar h-full space-y-5 overflow-y-auto border border-slate-800 bg-slate-950/20 p-5 backdrop-blur-xl">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-300" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Problem
          </span>
          <StatusBadge
            tone={
              problem.difficulty === 'Easy'
                ? 'success'
                : problem.difficulty === 'Medium'
                  ? 'warning'
                  : 'danger'
            }
          >
            {problem.difficulty}
          </StatusBadge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{problem.title}</h1>
        <p className="mt-2 text-xs text-slate-500">
          Acceptance {problem.acceptance.toFixed(1)}% | {problem.timeLimitMs || 0} ms |{' '}
          {problem.memoryLimitMb || 0} MB
        </p>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
        {problem.description}
      </p>

      <SectionCard title="Examples">
        <div className="space-y-3">
          {problem.examples.map((example) => (
            <div
              key={example.id}
              className="rounded-lg border border-white/[0.04] bg-slate-900/30 p-3"
            >
              <p className="font-mono text-[10px] font-bold uppercase text-slate-500">
                Example {example.id}
              </p>
              <div className="mt-2 space-y-1 font-mono text-xs text-slate-300">
                <p>
                  <span className="text-blue-300">Input:</span> {example.input}
                </p>
                <p>
                  <span className="text-emerald-300">Output:</span> {example.output}
                </p>
              </div>
              {example.explanation && (
                <p className="mt-2 border-t border-white/[0.04] pt-2 text-xs text-slate-400">
                  {example.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Constraints">
        <ul className="list-inside list-disc space-y-2 text-xs text-slate-300">
          {problem.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      </SectionCard>

      {problem.hints.length > 0 && (
        <SectionCard title="Hints">
          <div className="space-y-2">
            {problem.hints.map((hint) => (
              <p key={hint} className="flex gap-2 text-xs text-slate-300">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                {hint}
              </p>
            ))}
          </div>
        </SectionCard>
      )}

      {problem.explanation && (
        <SectionCard title="Explanation">
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">
            {problem.explanation}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
