import type { ExecutionResult, Submission, ExampleCase } from '../types/editor.types';

interface OutputConsoleProps {
  activeTab: 'testcase' | 'result';
  setActiveTab: (tab: 'testcase' | 'result') => void;
  runResult: ExecutionResult | null;
  submitResult: Submission | null;
  isRunning: boolean;
  isSubmitting: boolean;
  examples: ExampleCase[];
}

export function OutputConsole({
  activeTab,
  setActiveTab,
  runResult,
  submitResult,
  isRunning,
  isSubmitting,
  examples,
}: OutputConsoleProps) {
  const isPending = isRunning || isSubmitting;
  const hasResult = runResult || submitResult;

  return (
    <div className="flex h-full flex-col border border-white/[0.06] bg-slate-950/60 rounded-xl backdrop-blur-xl">
      {/* Tab Navigation */}
      <div className="flex h-10 items-center justify-between border-b border-white/[0.05] bg-slate-950/40 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('testcase')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'testcase'
                ? 'bg-white/5 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Testcases
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors relative ${
              activeTab === 'result'
                ? 'bg-white/5 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Result
            {hasResult && !isPending && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              Processing
            </span>
          )}
          {!isPending && runResult && (
            <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
              runResult.status === 'Success' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                runResult.status === 'Success' ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
              {runResult.status}
            </span>
          )}
          {!isPending && submitResult && (
            <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
              submitResult.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                submitResult.status === 'Accepted' ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
              {submitResult.status}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Loading State */}
        {isPending && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-6 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="font-mono text-xs tracking-wider">
              {isRunning ? 'Compiling & running tests...' : 'Running solution against target tests...'}
            </p>
          </div>
        )}

        {/* Tab 1: Default Testcases */}
        {!isPending && activeTab === 'testcase' && (
          <div className="space-y-4">
            {examples.map((example, i) => (
              <div key={example.id} className="rounded-lg bg-slate-900/30 border border-white/[0.03] p-3">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                  CASE {i + 1}
                </span>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 mr-2">Input:</span>
                    <span className="text-slate-200">{example.input}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-2">Expected:</span>
                    <span className="text-emerald-400/90">{example.output}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Execution Results */}
        {!isPending && activeTab === 'result' && (
          <>
            {/* Empty State */}
            {!hasResult && (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center text-slate-500">
                <svg
                  className="h-8 w-8 text-slate-600 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-xs font-medium">No results to show</p>
                <p className="text-[11px] text-slate-600 mt-1">Run or submit your solution to generate output logs.</p>
              </div>
            )}

            {/* Run Code Result */}
            {runResult && (
              <div className="space-y-4 font-mono text-xs">
                {runResult.status === 'Success' ? (
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                    <p className="text-sm font-bold text-emerald-400">All Test Cases Passed</p>
                    <div className="mt-3 grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-3 text-slate-300">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Runtime</p>
                        <p className="mt-0.5 font-bold text-white">{runResult.runtime} ms</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Memory</p>
                        <p className="mt-0.5 font-bold text-white">{runResult.memory} MB</p>
                      </div>
                    </div>
                    {runResult.stdout && (
                      <div className="mt-4">
                        <p className="text-[10px] text-slate-500 uppercase">Console Output</p>
                        <pre className="mt-1.5 overflow-x-auto rounded bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300 border border-white/[0.04]">
                          {runResult.stdout}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-4">
                    <p className="text-sm font-bold text-rose-400">{runResult.status}</p>
                    <div className="mt-3">
                      <p className="text-[10px] text-slate-500 uppercase">Compiler Logs / Error Stack</p>
                      <pre className="mt-1.5 overflow-x-auto rounded bg-slate-950/80 p-3 text-[11px] leading-relaxed text-rose-300/95 border border-white/[0.04] whitespace-pre-wrap">
                        {runResult.stderr}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Code Result */}
            {submitResult && (
              <div className="space-y-4 font-mono text-xs">
                {submitResult.status === 'Accepted' ? (
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                    <p className="text-sm font-bold text-emerald-400">Submission Accepted 🎉</p>
                    <p className="mt-1 text-[11px] text-slate-400">Your solution was successfully compiled and passed all tests.</p>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-3 text-slate-300">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Runtime Performance</p>
                        <p className="mt-0.5 font-bold text-white">{submitResult.runtime} ms</p>
                        <span className="text-[10px] text-slate-500">Beats 84.5% of JavaScript entries</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Memory Footprint</p>
                        <p className="mt-0.5 font-bold text-white">{submitResult.memory} MB</p>
                        <span className="text-[10px] text-slate-500">Beats 76.2% of JavaScript entries</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-4">
                    <p className="text-sm font-bold text-rose-400">Submission Rejected ❌</p>
                    <p className="mt-1 text-[11px] text-rose-300/80">
                      {submitResult.status === 'Wrong Answer' 
                        ? 'Your code output did not match the expected answer for some test cases.'
                        : 'Your solution threw a runtime exception during batch execution.'}
                    </p>
                    
                    <div className="mt-4 border-t border-white/[0.05] pt-3">
                      <p className="text-[10px] text-slate-500 uppercase">Submission Details</p>
                      <div className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                        <p><span className="text-slate-500">ID:</span> {submitResult.id}</p>
                        <p><span className="text-slate-500">Language:</span> {submitResult.language}</p>
                        <p><span className="text-slate-500">Timestamp:</span> {new Date(submitResult.submittedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
