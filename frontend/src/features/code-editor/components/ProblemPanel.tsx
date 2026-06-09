import type { Problem } from '../types/editor.types';

interface ProblemPanelProps {
  problem: Problem;
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const difficultyColors = {
    Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto border border-white/[0.06] bg-slate-950/40 p-6 backdrop-blur-xl custom-scrollbar">
      {/* Title & Badge */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">PROBLEM SET</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${difficultyColors[problem.difficulty]}`}
          >
            {problem.difficulty}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {problem.title}
        </h1>
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none text-slate-300">
        <p className="whitespace-pre-line leading-relaxed">{problem.description}</p>
      </div>

      {/* Examples */}
      <div className="mt-8 space-y-6">
        <h3 className="text-lg font-semibold text-white">Examples</h3>
        {problem.examples.map((example) => (
          <div
            key={example.id}
            className="rounded-xl border border-white/[0.05] bg-slate-950/60 p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-200">Example {example.id}:</p>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex gap-2">
                <span className="text-slate-500 select-none">Input:</span>
                <span className="text-slate-200">{example.input}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 select-none">Output:</span>
                <span className="text-slate-200">{example.output}</span>
              </div>
              {example.explanation && (
                <div className="mt-2 border-t border-white/[0.05] pt-2 text-slate-400">
                  <span className="font-sans font-semibold text-slate-500">Explanation: </span>
                  <span className="font-sans leading-relaxed">{example.explanation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div className="mt-8 border-t border-white/[0.06] pt-6">
        <h3 className="text-lg font-semibold text-white">Constraints</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-400">
          {problem.constraints.map((constraint, index) => (
            <li key={index} className="font-mono text-xs leading-relaxed">
              <span className="font-sans text-slate-300">{constraint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
