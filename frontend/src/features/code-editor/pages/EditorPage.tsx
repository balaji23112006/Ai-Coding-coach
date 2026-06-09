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
    <main className="min-h-screen bg-[#050508] text-white flex flex-col antialiased">
      {/* Premium Background Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(34,211,238,0.04),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(168,85,247,0.04),_transparent_40%)]" />
      <div
        className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.006)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.006)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(circle at 50% 50%, black 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 70%, transparent 100%)',
        }}
      />

      {/* Editor Header */}
      <header className="relative z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-slate-950/40 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
          
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-500 uppercase">
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
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4 h-[calc(100vh-3.5rem)]">
        {/* Left Panel - Problem Description (40%) */}
        <div className="w-full md:w-[40%] flex flex-col h-[50vh] md:h-full overflow-hidden rounded-2xl">
          <ProblemPanel problem={problem} />
        </div>

        {/* Right Panel - Editor & Console (60%) */}
        <div className="w-full md:w-[60%] flex flex-col h-[50vh] md:h-full overflow-hidden gap-4">
          {/* Code Editor Container (Flex child 1) */}
          <div className="flex-grow flex-1 min-h-[300px] flex flex-col overflow-hidden">
            <CodeEditor
              language={selectedLanguage}
              value={currentCode}
              onChange={handleCodeChange}
            />
          </div>

          {/* Action Buttons & Output Console (Flex child 2) */}
          <div className="h-[240px] flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-slate-950/40 backdrop-blur-xl">
            {/* Output Logger Console */}
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

            {/* Run / Submit Actions Toolbar */}
            <ActionButtons
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onRun={runCode}
              onSubmit={submitCode}
              onReset={resetCode}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
