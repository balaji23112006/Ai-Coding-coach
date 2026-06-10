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
    <div className="flex h-full flex-col overflow-y-auto border border-slate-800 bg-slate-950/20 p-6 backdrop-blur-xl custom-scrollbar">
      {/* Title & Badge */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase">PROBLEM</span>
          <span
            className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${difficultyColors[problem.difficulty]}`}
          >
            {problem.difficulty}
          </span>
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          {problem.title}
        </h1>
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
        <p className="whitespace-pre-line">{problem.description}</p>
      </div>

      {/* Examples */}
      <div className="mt-8 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Examples</h3>
        {problem.examples.map((example) => (
          <div
            key={example.id}
            className="rounded-xl bg-slate-900/40 p-4"
          >
            <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">Example {example.id}:</span>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex gap-2">
                <span className="text-blue-300/80 font-sans font-semibold select-none">Input:</span>
                <span className="text-slate-300">{example.input}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-400/80 font-sans font-semibold select-none">Output:</span>
                <span className="text-slate-300">{example.output}</span>
              </div>
              {example.explanation && (
                <div className="mt-3 border-t border-slate-800/40 pt-3 text-slate-400">
                  <span className="font-sans font-semibold text-slate-500">Explanation: </span>
                  <span className="font-sans leading-relaxed text-[11px] text-slate-400/90">{example.explanation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div className="mt-8 border-t border-slate-800/40 pt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Constraints</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-xs text-slate-400">
          {problem.constraints.map((constraint, index) => (
            <li key={index} className="font-mono leading-relaxed">
              <span className="font-sans text-slate-300">{constraint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
