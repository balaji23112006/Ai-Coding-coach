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
    <main className="h-screen bg-[#070a13] text-white flex flex-col antialiased overflow-hidden">
      {/* Premium Background Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(148,163,184,0.06),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(147,197,253,0.06),_transparent_40%)]" />
      <div
        className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.003)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none"
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/20 px-2.5 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase hover:border-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Dashboard</span>
          </button>
          
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono text-[9px] font-bold tracking-wider text-slate-500 uppercase">
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
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden p-2 gap-2 min-h-0">
        
        {/* Left Column: Problem description when coach is closed, editor when coach is open */}
        {!isCoachOpen ? (
          <div className="w-full md:w-[35%] flex flex-col h-[50vh] md:h-full overflow-hidden rounded-2xl">
            <ProblemPanel problem={problem} />
          </div>
        ) : (
          <div className="w-full md:w-[58%] flex flex-col h-[50vh] md:h-full overflow-hidden gap-2">
            {/* Code Editor Container */}
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <CodeEditor
                  language={selectedLanguage}
                  value={currentCode}
                  onChange={handleCodeChange}
                />
              </div>
            </div>

            {/* Output Console & Actions */}
            <div className="h-[280px] shrink-0 flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
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
          <div className="w-full md:w-[65%] flex flex-col md:h-full overflow-hidden gap-2">
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <CodeEditor
                  language={selectedLanguage}
                  value={currentCode}
                  onChange={handleCodeChange}
                />
              </div>
            </div>

            <div className="h-[280px] shrink-0 flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
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
          <div className="w-full md:w-[42%] flex flex-col h-full overflow-hidden">
            {/* Empty section for future coach review */}
            <div className="flex h-full flex-col border border-slate-800 bg-slate-900/40 rounded-2xl backdrop-blur-xl p-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <h2 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">AI Coach Review</h2>
                </div>
                <button
                  onClick={() => setIsCoachOpen(false)}
                  className="rounded border border-slate-700/60 bg-slate-800/20 px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50 hover:text-slate-200 transition"
                >
                  Close Panel
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/10">
                <div className="h-10 w-10 rounded-full bg-slate-900/40 flex items-center justify-center mb-4 border border-slate-800/60">
                  <BrainCircuit className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Coach Ready</h3>
                <p className="max-w-xs text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Workspace shifted. The AI Coach review panel has been initialized. Submit your code to receive feedback and conceptual guidance here.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
