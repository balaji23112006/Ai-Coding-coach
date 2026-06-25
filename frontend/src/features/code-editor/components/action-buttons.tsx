import { Play, Send, RotateCcw, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  isCoachOpen,
  onToggleCoach,
}: ActionButtonsProps) {
  const isPending = isRunning || isSubmitting;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between border-t border-slate-800/40 bg-slate-950/20 px-4 py-3">
        {/* Left Actions: Reset + Ask Mentor */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onReset}
                disabled={isPending}
                className="h-8 rounded-md bg-transparent px-3 text-xs text-slate-400 shadow-none transition-colors hover:bg-slate-800/30 hover:text-slate-100"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-950 text-[10px] text-slate-400">
              Reset editor code to template
            </TooltipContent>
          </Tooltip>

          {onToggleCoach && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onToggleCoach}
                  disabled={isPending}
                  className={`h-8 rounded-md px-3 text-xs shadow-none transition-colors ${
                    isCoachOpen
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15'
                      : 'bg-transparent text-slate-400 hover:bg-slate-800/30 hover:text-amber-400'
                  }`}
                >
                  <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ask Mentor</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border-slate-800 bg-slate-950 text-[10px] text-slate-400">
                Toggle Mentor AI panel
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right Actions: Run + Submit */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRun}
                disabled={isPending}
                className="min-h-9 rounded-md border border-slate-700/50 bg-slate-900/40 px-4 text-xs text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-800/50 hover:text-white"
              >
                {isRunning ? (
                  <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                )}
                <span>Run Code</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-950 font-mono text-[10px] text-slate-400">
              Ctrl + Enter
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSubmit}
                disabled={isPending}
                className="min-h-9 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.15)] shadow-md shadow-amber-950/10 transition-all duration-300 hover:from-amber-400 hover:to-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]"
              >
                {isSubmitting ? (
                  <span className="mr-1.5 text-xs">⏳</span>
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-950 font-mono text-[10px] text-slate-400">
              Ctrl + Shift + Enter
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
