import { TerminalSquare, CheckCircle2, XCircle, AlertCircle, Clock, Cpu, Sparkles } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#070a13]/60 backdrop-blur-xl"
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'testcase' | 'result')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-10 items-center justify-between border-b border-white/[0.05] bg-slate-950/40 px-4">
          <TabsList className="bg-transparent p-0 gap-1">
            <TabsTrigger
              value="testcase"
              className="text-xs transition-all duration-200 rounded-md px-3 py-1 data-[state=active]:bg-white/5 data-[state=active]:text-slate-100 hover:text-slate-300"
            >
              Testcases
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="text-xs transition-all duration-200 rounded-md px-3 py-1 data-[state=active]:bg-white/5 data-[state=active]:text-slate-100 hover:text-slate-300"
            >
              Output
              {runResult && !isRunning && (
                <span
                  className={`ml-2 h-1.5 w-1.5 rounded-full animate-pulse ${allPassed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {isRunning && (
              <StatusBadge>
                <span className="h-1 w-1 animate-ping rounded-full bg-cyan-400" />
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
            <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="font-mono text-xs tracking-wider animate-pulse text-cyan-400/80">Executing tests in sandbox...</p>
            </div>
          )}

          {!isRunning && (
            <TabsContent value="testcase" className="mt-0 space-y-4">
              {examples.map((example, index) => (
                <SectionCard key={example.id} className="border-white/[0.03] bg-slate-900/10 hover:border-white/[0.06] transition-colors duration-200" contentClassName="p-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Case {index + 1}
                  </span>
                  <div className="mt-2 space-y-1.5 font-mono text-xs">
                    <div className="flex items-start">
                      <span className="w-16 shrink-0 text-slate-500">Input:</span>
                      <span className="text-slate-200 select-all">{example.input}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-16 shrink-0 text-slate-500">Expected:</span>
                      <span className="text-emerald-400/90 select-all">{example.output}</span>
                    </div>
                  </div>
                </SectionCard>
              ))}
            </TabsContent>
          )}

          {!isRunning && (
            <TabsContent value="result" className="mt-0 space-y-4">
              {!runResult && (
                <EmptyState
                  icon={TerminalSquare}
                  title="No output yet"
                  description="Run or Submit your solution to see the verification logs."
                  className="h-full"
                />
              )}

              {runResult && (
                <div className="space-y-4 font-mono text-xs">
                  {/* Verdict Banner */}
                  {allPassed ? (
                    <div className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0 animate-bounce" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Accepted</h3>
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                          </div>
                          <p className="mt-1 text-slate-300 text-[11px]">Your solution successfully passed all tests.</p>
                        </div>
                      </div>
                    </div>
                  ) : runResult.status === 'Wrong Answer' || (runResult.status === 'Success' && total > 0 && passed < total) ? (
                    <div className="relative overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-rose-500/10 blur-xl" />
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-5 w-5 text-rose-400 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Wrong Answer</h3>
                          <p className="mt-1 text-slate-300 text-[11px]">{passed} / {total} test cases passed. Some cases produced incorrect values.</p>
                        </div>
                      </div>
                    </div>
                  ) : hasError ? (
                    <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      <AlertTitle className="text-sm font-bold uppercase tracking-wide text-rose-400">
                        {runResult.status}
                      </AlertTitle>
                      <AlertDescription className="text-slate-300 text-[11px] mt-1">
                        The sandbox encountered an execution error while running your program.
                      </AlertDescription>
                    </Alert>
                  ) : runResult.status === 'Time Limit Exceeded' ? (
                    <div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-amber-500/10 blur-xl" />
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Time Limit Exceeded</h3>
                          <p className="mt-1 text-slate-300 text-[11px]">Your program did not finish within the allowed execution limit.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Metrics Badges Row */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {runResult.runtime !== undefined && (
                      <Badge variant="secondary" className="flex items-center gap-1.5 bg-slate-900 border border-white/[0.04] text-slate-300 text-[10px] py-1 px-2.5">
                        <Clock className="h-3 w-3 text-cyan-400" />
                        Runtime: {runResult.runtime} ms
                      </Badge>
                    )}
                    {runResult.memory !== undefined && runResult.memory > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1.5 bg-slate-900 border border-white/[0.04] text-slate-300 text-[10px] py-1 px-2.5">
                        <Cpu className="h-3 w-3 text-violet-400" />
                        Memory: {runResult.memory} MB
                      </Badge>
                    )}
                    {total > 0 && (
                      <Badge variant="secondary" className={`flex items-center gap-1.5 bg-slate-900 border text-[10px] py-1 px-2.5 ${allPassed ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                        {passed} / {total} Testcases Passed
                      </Badge>
                    )}
                  </div>

                  {/* Errors Block */}
                  {hasError && runResult.stderr && (
                    <SectionCard className="border-rose-500/10 bg-rose-950/10">
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-white/[0.04] bg-slate-950/80 p-3 text-[11px] leading-relaxed text-rose-300/90 font-mono">
                        {runResult.stderr}
                      </pre>
                    </SectionCard>
                  )}

                  {/* Passed Visual Progress Indicators */}
                  {(runResult.status === 'Success' || runResult.status === 'Wrong Answer') && total > 0 && (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {Array.from({ length: total }, (_, index) => (
                          <div
                            key={index}
                            title={`Test case ${index + 1}: ${index < passed ? 'Passed' : 'Failed'}`}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${index < passed ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-rose-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Test Case Breakdown */}
                  {runResult.failedCases && runResult.failedCases.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed Case Details</h4>
                        <span className="text-[10px] text-rose-400/80 font-semibold">{runResult.failedCases.length} failing</span>
                      </div>
                      <div className="space-y-2.5">
                        {runResult.failedCases.map((failedCase, idx) => (
                          <div
                            key={failedCase.testCaseId || idx}
                            className="rounded-lg border border-rose-500/15 bg-rose-950/5 hover:bg-rose-950/10 transition-colors p-3 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-400">Test Case {Number(failedCase.testCaseId) + 1}</span>
                              <Badge variant="destructive" className="bg-rose-950/40 text-rose-400 border border-rose-500/20 text-[9px] font-bold py-0.5 px-2">
                                Failed
                              </Badge>
                            </div>
                            
                            {failedCase.input && (
                              <div className="space-y-2 text-[11px] font-mono">
                                <div className="bg-slate-950/40 p-2 rounded border border-white/[0.03]">
                                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Input</span>
                                  <code className="text-slate-200 break-all">{failedCase.input}</code>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-slate-950/40 p-2 rounded border border-white/[0.03]">
                                    <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Expected Output</span>
                                    <code className="text-emerald-400 font-semibold break-all">{failedCase.expectedOutput}</code>
                                  </div>
                                  <div className="bg-slate-950/40 p-2 rounded border border-white/[0.03]">
                                    <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Actual Output</span>
                                    <code className="text-rose-400 font-semibold break-all">{failedCase.actualOutput || 'No output'}</code>
                                  </div>
                                </div>
                              </div>
                            )}

                            {failedCase.errorMessage && (
                              <div className="text-[11px] text-rose-300/90 font-mono bg-slate-950/50 p-2 rounded border border-rose-500/10">
                                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Execution Failure Details</span>
                                {failedCase.errorMessage}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standard Console Output */}
                  {runResult.stdout && !runResult.stdout.startsWith('Passed') && (
                    <SectionCard className="border-white/[0.03] bg-slate-900/5 mt-2" contentClassName="p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Stdout logs</span>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-white/[0.04] bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300 font-mono">
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
