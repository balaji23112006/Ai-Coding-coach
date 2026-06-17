import { Play, Send, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isCoachOpen?: boolean;
  onToggleCoach?: () => void;
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
    <div className="flex items-center justify-between border-t border-slate-800/40 bg-slate-950/20 px-4 py-3">
      {/* Reset */}
      <Button
        onClick={onReset}
        disabled={isPending}
        className="h-8 rounded-md bg-transparent px-3 text-xs text-slate-400 shadow-none hover:bg-slate-800/30 hover:text-slate-100"
        title="Reset editor code to template"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reset</span>
      </Button>

      {/* Run + Submit */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onRun}
          disabled={isPending}
          className="min-h-9 rounded-md border border-slate-700/50 bg-slate-900/40 px-4 text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-800/40 hover:text-white"
        >
          {isRunning ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          <span>Run Code</span>
        </Button>

        <Button
          onClick={onSubmit}
          disabled={isPending}
          className="min-h-9 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs text-slate-950 shadow-md shadow-amber-950/10 hover:from-amber-400 hover:to-amber-500"
        >
          {isSubmitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Submit</span>
        </Button>
      </div>
    </div>
  );
}
