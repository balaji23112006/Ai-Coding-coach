import { Play, Send, RotateCcw } from 'lucide-react';

interface ActionButtonsProps {
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function ActionButtons({
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
  onReset,
}: ActionButtonsProps) {
  const isPending = isRunning || isSubmitting;

  return (
    <div className="flex items-center justify-between border-t border-white/[0.05] bg-slate-950/40 p-4">
      {/* Reset Template */}
      <button
        onClick={onReset}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-slate-100 disabled:opacity-40"
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
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          <span>Run Code</span>
        </button>

        {/* Submit Solution Button */}
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:shadow-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
}
