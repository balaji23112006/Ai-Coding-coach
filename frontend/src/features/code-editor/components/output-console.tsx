import { TerminalSquare } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExecutionResult, ExampleCase } from '../types/editor-types';

interface OutputConsoleProps {
  activeTab: 'testcase' | 'result';
  setActiveTab: (tab: 'testcase' | 'result') => void;
  runResult: ExecutionResult | null;
  isRunning: boolean;
  examples: ExampleCase[];
}

export function OutputConsole({
  activeTab,
  setActiveTab,
  runResult,
  isRunning,
  examples,
}: OutputConsoleProps) {
  const passed = runResult?.passedCount ?? 0;
  const total = runResult?.totalCount ?? 0;
  const allPassed = runResult?.status === 'Success' && passed === total && total > 0;
  const hasError = runResult?.status === 'Compile Error' || runResult?.status === 'Runtime Error';

  return (
    <SectionCard
      className="flex h-full flex-col overflow-hidden rounded-xl"
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'testcase' | 'result')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-10 items-center justify-between border-b border-white/[0.05] bg-slate-950/40 px-4">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger
              value="testcase"
              className="text-xs data-[state=active]:bg-white/5 data-[state=active]:text-slate-100"
            >
              Testcases
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="text-xs data-[state=active]:bg-white/5 data-[state=active]:text-slate-100"
            >
              Output
              {runResult && !isRunning && (
                <span
                  className={`ml-2 h-2 w-2 rounded-full ${allPassed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {isRunning && (
              <StatusBadge>
                <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400" />
                Running
              </StatusBadge>
            )}
            {!isRunning && runResult && (
              <StatusBadge tone={allPassed ? 'success' : hasError ? 'danger' : 'warning'}>
                {allPassed ? `${passed}/${total} Passed` : runResult.status === 'Success' ? `${passed}/${total} Passed` : runResult.status}
              </StatusBadge>
            )}
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {isRunning && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-6 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="font-mono text-xs tracking-wider">Running against test cases...</p>
            </div>
          )}

          {!isRunning && (
            <TabsContent value="testcase" className="mt-0 space-y-4">
              {examples.map((example, index) => (
                <SectionCard key={example.id} className="border-white/[0.03] bg-slate-900/30" contentClassName="p-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                    Case {index + 1}
                  </span>
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div>
                      <span className="mr-2 text-slate-400">Input:</span>
                      <span className="text-slate-200">{example.input}</span>
                    </div>
                    <div>
                      <span className="mr-2 text-slate-400">Expected:</span>
                      <span className="text-emerald-400/90">{example.output}</span>
                    </div>
                  </div>
                </SectionCard>
              ))}
            </TabsContent>
          )}

          {!isRunning && (
            <TabsContent value="result" className="mt-0">
              {!runResult && (
                <EmptyState
                  icon={TerminalSquare}
                  title="No output yet"
                  description="Click Run Code to test your solution."
                  className="h-full"
                />
              )}

              {runResult && (
                <div className="space-y-4 font-mono text-xs">
                  {hasError && (
                    <SectionCard className="border-rose-500/10 bg-rose-500/5">
                      <p className="text-sm font-bold text-rose-400">{runResult.status}</p>
                      {runResult.stderr && (
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-white/[0.04] bg-slate-950/80 p-3 text-[11px] leading-relaxed text-rose-300">
                          {runResult.stderr}
                        </pre>
                      )}
                    </SectionCard>
                  )}

                  {(runResult.status === 'Success' || runResult.status === 'Wrong Answer') && total > 0 && (
                    <SectionCard className={allPassed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`text-sm font-bold ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {allPassed ? 'All Testcases Passed' : `${passed}/${total} Testcases Passed`}
                        </span>
                        {runResult.runtime !== undefined && (
                          <span className="text-[10px] text-slate-500">{runResult.runtime} ms</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: total }, (_, index) => (
                          <div
                            key={index}
                            title={`Test ${index + 1}: ${index < passed ? 'Passed' : 'Failed'}`}
                            className={`h-1.5 flex-1 rounded-full ${index < passed ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {runResult.stdout && !runResult.stdout.startsWith('Passed') && (
                    <SectionCard title="Console Output">
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-white/[0.04] bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300">
                        {runResult.stdout}
                      </pre>
                    </SectionCard>
                  )}
                </div>
              )}
            </TabsContent>
          )}
        </div>
      </Tabs>
    </SectionCard>
  );
}
