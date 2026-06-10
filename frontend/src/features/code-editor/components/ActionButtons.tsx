import { Play, Send, RotateCcw, BrainCircuit } from 'lucide-react';

interface ActionButtonsProps {
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isCoachOpen: boolean;
  onToggleCoach: () => void;
}

export function ActionButtons({
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
  onReset,
  isCoachOpen,
  onToggleCoach,
}: ActionButtonsProps) {
  const isPending = isRunning || isSubmitting;

  return (
    <div className="flex items-center justify-between border-t border-slate-800/40 bg-slate-950/20 p-4">
      {/* Reset Template */}
      <button
        onClick={onReset}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800/30 hover:text-slate-100 disabled:opacity-40"
        title="Reset editor code to template"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reset Code</span>
      </button>

      {/* Execution Buttons */}
      <div className="flex items-center gap-3">
        {/* Run Code Button */}
        <button
          onClick={onRun}
          disabled={isPending}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          <span>Run Code</span>
        </button>

        {/* Submit Solution Button */}
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-amber-950/10 transition hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Submit</span>
        </button>

        {/* Ask Coach Button */}
        <button
          onClick={onToggleCoach}
          disabled={isPending}
          className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isCoachOpen
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
          }`}
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          <span>{isCoachOpen ? 'Close Coach' : 'Ask Coach'}</span>
        </button>
      </div>
    </div>
  );
}

