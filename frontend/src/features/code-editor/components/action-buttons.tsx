import { Play, Send, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <TooltipProvider>
      <div className="flex items-center justify-between border-t border-slate-800/40 bg-slate-950/20 px-4 py-3">
        {/* Reset */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onReset}
              disabled={isPending}
              className="h-8 rounded-md bg-transparent px-3 text-xs text-slate-400 shadow-none hover:bg-slate-800/30 hover:text-slate-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              <span>Reset</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-950 border-slate-800 text-[10px] text-slate-400">
            Reset editor code to template
          </TooltipContent>
        </Tooltip>

        {/* Run + Submit */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRun}
                disabled={isPending}
                className="min-h-9 rounded-md border border-slate-700/50 bg-slate-900/40 px-4 text-xs text-slate-300 hover:border-slate-500 hover:bg-slate-800/50 hover:text-white transition-all"
              >
                {isRunning ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mr-1.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
                )}
                <span>Run Code</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-950 border-slate-800 text-[10px] text-slate-400 font-mono">
              Ctrl + Enter
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSubmit}
                disabled={isPending}
                className="min-h-9 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs font-bold text-slate-950 shadow-md shadow-amber-950/10 hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]"
              >
                {isSubmitting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent mr-1.5" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                <span>Submit</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-950 border-slate-800 text-[10px] text-slate-400 font-mono">
              Ctrl + Shift + Enter
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
