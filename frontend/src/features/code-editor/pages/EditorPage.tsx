import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import { useCodeEditor } from '../hooks/useCodeEditor';
import { ProblemPanel } from '../components/ProblemPanel';
import { LanguageSelector } from '../components/LanguageSelector';
import { CodeEditor } from '../components/CodeEditor';
import { OutputConsole } from '../components/OutputConsole';
import { ActionButtons } from '../components/ActionButtons';
import type { Problem } from '../types/editor.types';

// Mock Problem definition
const TWO_SUM_PROBLEM: Problem = {
  id: 'two-sum',
  title: '1. Two Sum',
  difficulty: 'Easy',
  description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      id: 1,
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      id: 2,
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
    },
    {
      id: 3,
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
    },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    'Only one valid answer exists.',
  ],
};

export default function EditorPage() {
  const navigate = useNavigate();
  const problem = TWO_SUM_PROBLEM;
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const {
    selectedLanguage,
    currentCode,
    isRunning,
    isSubmitting,
    runResult,
    submitResult,
    activeConsoleTab,
    handleLanguageChange,
    handleCodeChange,
    runCode,
    submitCode,
    resetCode,
    setActiveConsoleTab,
  } = useCodeEditor(problem.id);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#070a13] text-white antialiased">
      {/* Premium Background Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(148,163,184,0.06),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(147,197,253,0.06),_transparent_40%)]" />
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.003)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-40"
        style={{
          maskImage: 'radial-gradient(circle at 50% 50%, black 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 70%, transparent 100%)',
        }}
      />

      {/* Editor Header */}
      <header className="relative z-30 flex h-9 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/20 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:border-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <BrainCircuit className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              SKILL LENS // PRACTICE ARENA
            </span>
          </div>
        </div>

        {/* Right side Language Selector */}
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </header>

      {/* Main Workspace Split Layout */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 md:flex-row">
        {/* Left Column: Problem description when coach is closed, editor when coach is open */}
        {!isCoachOpen ? (
          <div className="flex h-[50vh] w-full flex-col overflow-hidden rounded-2xl md:h-full md:w-[35%]">
            <ProblemPanel problem={problem} />
          </div>
        ) : (
          <div className="flex h-[50vh] w-full flex-col gap-2 overflow-hidden md:h-full md:w-[58%]">
            {/* Code Editor Container */}
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0">
                <CodeEditor
                  language={selectedLanguage}
                  value={currentCode}
                  onChange={handleCodeChange}
                />
              </div>
            </div>

            {/* Output Console & Actions */}
            <div className="flex h-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
              <div className="flex-1 overflow-hidden">
                <OutputConsole
                  activeTab={activeConsoleTab}
                  setActiveTab={setActiveConsoleTab}
                  runResult={runResult}
                  submitResult={submitResult}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  examples={problem.examples}
                />
              </div>
              <ActionButtons
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                onRun={runCode}
                onSubmit={submitCode}
                onReset={resetCode}
                isCoachOpen={isCoachOpen}
                onToggleCoach={() => setIsCoachOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Right Column: Editor when coach is closed, AI coach review panel when coach is open */}
        {!isCoachOpen ? (
          <div className="flex w-full flex-col gap-2 overflow-hidden md:h-full md:w-[65%]">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0">
                <CodeEditor
                  language={selectedLanguage}
                  value={currentCode}
                  onChange={handleCodeChange}
                />
              </div>
            </div>

            <div className="flex h-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
              <div className="flex-1 overflow-hidden">
                <OutputConsole
                  activeTab={activeConsoleTab}
                  setActiveTab={setActiveConsoleTab}
                  runResult={runResult}
                  submitResult={submitResult}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  examples={problem.examples}
                />
              </div>
              <ActionButtons
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                onRun={runCode}
                onSubmit={submitCode}
                onReset={resetCode}
                isCoachOpen={isCoachOpen}
                onToggleCoach={() => setIsCoachOpen(true)}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col overflow-hidden md:w-[42%]">
            {/* Empty section for future coach review */}
            <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    AI Coach Review
                  </h2>
                </div>
                <button
                  onClick={() => setIsCoachOpen(false)}
                  className="rounded border border-slate-700/60 bg-slate-800/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
                >
                  Close Panel
                </button>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800/60 bg-slate-950/10 p-6 text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/60 bg-slate-900/40">
                  <BrainCircuit className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Coach Ready
                </h3>
                <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-slate-500">
                  Workspace shifted. The AI Coach review panel has been initialized. Submit your
                  code to receive feedback and conceptual guidance here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
