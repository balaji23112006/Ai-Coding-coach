import { CheckCircle2 } from 'lucide-react';
import type { ExecutionResult, Problem, Submission } from '../types/editor-types';

interface OutputConsoleProps {
  activeTab?: 'testcase' | 'result' | 'submissions';
  setActiveTab?: (tab: 'testcase' | 'result' | 'submissions') => void;
  runResult: ExecutionResult | null;
  isRunning: boolean;
  isSubmitting?: boolean;
  examples?: Problem['examples'];
  submitResult?: Submission | null;
  submissionHistory?: Submission[];
  problem?: Problem;
}

export function OutputConsole({
  runResult,
  activeTab = 'testcase',
  setActiveTab,
  examples = [],
}: OutputConsoleProps) {
  const result = runResult;

  const tabs: { id: 'testcase' | 'result'; label: string; badge?: number }[] = [
    { id: 'testcase', label: 'Test Cases' },
    { id: 'result', label: 'Results' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 border-t border-slate-800/40">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-slate-800/40 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab?.(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab.id ? 'border-b-2 border-amber-500 text-amber-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'testcase' && (
          <div className="p-4">
            {examples && examples.length > 0 ? (
              <div className="space-y-3">
                {examples.slice(0, 2).map((example) => (
                  <div key={example.id} className="rounded border border-slate-800/60 bg-slate-950/30 p-2 text-xs">
                    <p className="text-slate-500">Input</p>
                    <pre className="whitespace-pre-wrap break-words font-mono text-slate-300">{example.input}</pre>
                    <p className="mt-1 text-slate-500">Expected Output</p>
                    <pre className="whitespace-pre-wrap break-words font-mono text-slate-300">{example.output}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Run your code to see test results.</p>
            )}
          </div>
        )}
        {activeTab === 'result' && (
          <div className="p-4">
            {/* Minimal result view: only show status and basic metrics */}
            {result ? (
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Status: {('status' in result && result.status) || 'N/A'}</span>
                </div>
                {'runtime' in result && (
                  <div>Runtime: {result.runtime ?? 0} ms</div>
                )}
                {'memory' in result && (
                  <div>Memory: {result.memory ?? 0} MB</div>
                )}
                {'passedCount' in result && ('totalCount' in result) && (
                  <div>Tests: {result.passedCount ?? 0} / {result.totalCount ?? '?'} </div>
                )}
                {/* Show output if available */}
                {(result as any).stdout && (
                  <pre className="mt-2 rounded bg-slate-950/60 p-2 text-xs text-slate-300 overflow-auto max-h-32 whitespace-pre-wrap break-words font-mono">
                    {(result as any).stdout}
                  </pre>
                )}
                {(result as any).stderr && (
                  <pre className="mt-2 rounded border border-red-700/30 bg-red-950/20 p-2 text-xs text-red-300 overflow-auto max-h-32 whitespace-pre-wrap break-words font-mono">
                    {(result as any).stderr}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No result to display.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
