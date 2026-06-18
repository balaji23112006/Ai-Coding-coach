import type { ExecutionResult, Submission, Problem } from '../types/editor-types';
import { ResultsPanel } from './results-panel';

interface OutputConsoleProps {
  activeTab?: 'testcase' | 'result';
  setActiveTab?: (tab: 'testcase' | 'result') => void;
  runResult: ExecutionResult | null;
  submitResult?: Submission | null;
  isRunning: boolean;
  isSubmitting?: boolean;
  examples?: Problem['examples'];
  problem?: Problem;
  submissionHistory?: Submission[];
}

export function OutputConsole({
  runResult,
  submitResult,
  isRunning,
  isSubmitting = false,
  activeTab = 'testcase',
  setActiveTab,
  examples = [],
  problem,
  submissionHistory = [],
}: OutputConsoleProps) {
  const result = submitResult || runResult;
  const type = submitResult ? 'submit' : 'run';
  const isLoading = isRunning || isSubmitting;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 border-t border-slate-800/40">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-slate-800/40 px-4 py-2">
        <button
          onClick={() => setActiveTab?.('testcase')}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'testcase'
              ? 'border-b-2 border-amber-500 text-amber-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Test Cases
        </button>
        <button
          onClick={() => setActiveTab?.('result')}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === 'result'
              ? 'border-b-2 border-amber-500 text-amber-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Results
        </button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'testcase' ? (
          <div className="p-4">
            {examples && examples.length > 0 ? (
              <div className="space-y-3">
                {examples.map((example, idx) => (
                  <div key={idx} className="rounded border border-slate-700/30 bg-slate-900/20 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-300">Example {idx + 1}</p>
                    <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-words mb-1">
                      {example.input}
                    </pre>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Output:</p>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                      {example.output}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Run your code to see test results.</p>
            )}
          </div>
        ) : (
          <ResultsPanel
            type={type}
            result={result}
            isLoading={isLoading}
            examples={examples}
            benchmark={{
              runtimeMs: problem?.timeLimitMs ?? 2000,
              memoryMb: problem?.memoryLimitMb ?? 256,
            }}
            submissionHistory={submissionHistory}
          />
        )}
      </div>
    </div>
  );
}
