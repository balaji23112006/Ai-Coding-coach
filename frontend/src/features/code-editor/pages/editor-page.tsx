import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, BrainCircuit, GripHorizontal, GripVertical } from 'lucide-react';

import { ActionButtons } from '../components/action-buttons';
import { CodeEditor } from '../components/code-editor';
import { LanguageSelector } from '../components/language-selector';
import { LeftPanel } from '../components/left-panel';
import { MentorPanel } from '../components/mentor-panel';
import { OutputConsole } from '../components/output-console';
import { useCodeEditor } from '../hooks/use-code-editor';
import { useMentor } from '../hooks/use-mentor';
import type { Problem } from '../types/editor-types';

function mapBackendToEditorProblem(q: any): Problem {
  const sampleCases = (q.test_cases || [])
    .filter((tc: any) => !tc.is_hidden)
    .map((tc: any, index: number) => ({
      id: index + 1,
      input: tc.input,
      output: tc.expected_output,
      explanation: tc.explanation || '',
    }));

  return {
    id: q.id,
    slug: q.slug || '',
    title: q.title || 'Untitled',
    difficulty: q.difficulty || 'Medium',
    topics: q.topics || [],
    acceptance: 50.0,
    description: q.description || '',
    constraints: q.constraints || [],
    examples: sampleCases,
    hints: q.hints || [],
    explanation: q.explanation || '',
    testCases: (q.test_cases || []).map((tc: any) => ({
      input: tc.input,
      expected_output: tc.expected_output,
      is_hidden: tc.is_hidden,
    })),
    templates: {
      javascript: q.starter_code?.javascript || '',
      python: q.starter_code?.python || '',
      typescript: q.starter_code?.typescript || '',
      java: q.starter_code?.java || '',
      cpp: q.starter_code?.cpp || '',
    },
    timeLimitMs: q.time_limit || 2000,
    memoryLimitMb: q.memory_limit || 256,
  };
}

export function EditorPage() {
  const { problemSlug } = useParams({ strict: false }) as { problemSlug?: string };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!problemSlug) return;
    let active = true;
    setLoading(true);
    setError(null);

    async function loadProblem() {
      try {
        const res = await fetch(`/api/questions/${problemSlug}`);
        if (!res.ok) {
          throw new Error('Problem not found');
        }
        const data = await res.json();
        if (!active) return;
        setProblem(mapBackendToEditorProblem(data));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load problem');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProblem();
    return () => {
      active = false;
    };
  }, [problemSlug]);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#070a13] text-white">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Loading workspace...</p>
        </div>
      </main>
    );
  }

  if (error || !problem) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#070a13] text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center shadow-2xl">
          <p className="text-sm font-semibold text-slate-200">{error || 'Problem not found.'}</p>
          <p className="mt-2 text-xs text-slate-500">
            The selected practice problem could not be loaded.
          </p>
          <Link
            to="/practice"
            className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
          >
            Back to Practice
          </Link>
        </div>
      </main>
    );
  }

  return <EditorWorkspace problem={problem} />;
}

function EditorWorkspace({ problem }: { problem: Problem }) {
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(() => Number(window.sessionStorage.getItem('skill-lens:editor:left-width')) || 38);
  const [bottomHeight, setBottomHeight] = useState(() => Number(window.sessionStorage.getItem('skill-lens:editor:bottom-height')) || 260);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const {
    selectedLanguage,
    currentCode,
    isRunning,
    isSubmitting,
    runResult,
    submitResult,
    submissionHistory,
    stats,
    activeConsoleTab,
    handleLanguageChange,
    handleCodeChange,
    runCode,
    submitCode,
    resetCode,
    setActiveConsoleTab,
  } = useCodeEditor(problem.id, problem.templates);

  const mentor = useMentor({
    problemId: problem.id,
    problemTitle: problem.title,
    currentCode,
    language: selectedLanguage,
    executionResult: runResult,
  });

  // Auto-prompt mentor when submission fails or has errors
  useEffect(() => {
    if (!runResult || isRunning || isSubmitting) return;

    const isFailure =
      runResult.status === 'Runtime Error' ||
      runResult.status === 'Compile Error' ||
      runResult.status === 'Wrong Answer';

    if (isFailure && !mentor.isLoading) {
      // Show a subtle prompt without auto-opening
      // User can click "Ask Mentor" if they want guidance
    }
  }, [runResult, isRunning, isSubmitting, mentor.isLoading]);

  // Map runResult status to mentor trigger event
  const getMentorTrigger = (): Parameters<typeof mentor.requestHint>[0] => {
    if (!runResult) return 'hint_request';
    if (runResult.status === 'Compile Error') return 'compile_error';
    if (runResult.status === 'Runtime Error') return 'runtime_error';
    if (runResult.status === 'Wrong Answer') return 'test_fail';
    return 'hint_request';
  };

  const handleRequestHint = () => {
    mentor.requestHint(getMentorTrigger());
  };

  useEffect(() => {
    window.sessionStorage.setItem('skill-lens:editor:left-width', String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    window.sessionStorage.setItem('skill-lens:editor:bottom-height', String(bottomHeight));
  }, [bottomHeight]);

  useEffect(() => {
    if (submitResult?.status !== 'Accepted') return;

    const key = 'skill-lens:practice:solved-problems';
    let solvedIds: string[] = [];
    try {
      solvedIds = JSON.parse(window.localStorage.getItem(key) || '[]') as string[];
    } catch {
      solvedIds = [];
    }

    const next = solvedIds.includes(problem.id) ? solvedIds : [...solvedIds, problem.id];
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('skill-lens:practice-progress-updated', {
      detail: { problemId: problem.id, solvedQuestionIds: next },
    }));
    window.dispatchEvent(new CustomEvent('skill-lens:dashboard-refresh-requested', {
      detail: { problemId: problem.id },
    }));
    window.dispatchEvent(new CustomEvent('skill-lens:leaderboard-refresh-requested', {
      detail: { problemId: problem.id },
    }));
  }, [problem.id, submitResult?.id, submitResult?.status]);

  const startHorizontalResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const move = (moveEvent: MouseEvent) => {
      const next = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setLeftCollapsed(false);
      setLeftWidth(Math.min(58, Math.max(26, next)));
    };
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  };

  const startVerticalResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const bounds = centerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const move = (moveEvent: MouseEvent) => {
      const next = bounds.bottom - moveEvent.clientY;
      setBottomCollapsed(false);
      setBottomHeight(Math.min(430, Math.max(180, next)));
    };
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#070a13] text-white antialiased">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(148,163,184,0.06),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(147,197,253,0.06),_transparent_40%)]" />

      <header className="relative z-30 flex h-9 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/20 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate({ to: '/practice' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:border-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Practice List</span>
          </button>

          <div className="flex items-center gap-2">
            <BrainCircuit className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              SKILL LENS // PRACTICE ARENA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mentor Toggle Button */}
          <button
            id="mentor-toggle-btn"
            onClick={mentor.toggleOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              mentor.isOpen
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
            }`}
          >
            <BrainCircuit className="h-3 w-3" />
            <span>Mentor AI</span>
            {mentor.messages.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-slate-950">
                {mentor.messages.filter(m => m.role === 'mentor').length}
              </span>
            )}
          </button>

          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </header>

      <div ref={workspaceRef} className="relative z-10 flex min-h-0 flex-1 overflow-hidden p-2">
        {/* Left Panel — Problem Description */}
        <div
          className="flex h-full flex-col overflow-hidden rounded-l-2xl transition-[width] duration-150"
          style={{ width: leftCollapsed ? 0 : `${leftWidth}%` }}
        >
          {!leftCollapsed && (
            <LeftPanel
              problem={problem}
              submissionHistory={submissionHistory}
              latestSubmission={submitResult}
              stats={stats}
              loadSubmittedCode={handleCodeChange}
            />
          )}
        </div>

        <button
          onMouseDown={startHorizontalResize}
          onClick={() => setLeftCollapsed(prev => !prev)}
          title="Drag to resize problem panel. Click to collapse or expand."
          className="mx-1 flex w-2 cursor-col-resize items-center justify-center rounded bg-slate-900/80 text-slate-600 transition hover:bg-slate-800 hover:text-amber-400"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Center — Code Editor + Console */}
        <div
          ref={centerRef}
          className={`flex min-w-0 flex-col overflow-hidden md:h-full transition-all duration-300 ${
            mentor.isOpen ? 'w-full md:w-[37%]' : 'w-full md:w-[62%]'
          }`}
        >
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <CodeEditor
                language={selectedLanguage}
                value={currentCode}
                onChange={handleCodeChange}
              />
            </div>
          </div>

          <button
            onMouseDown={startVerticalResize}
            onClick={() => setBottomCollapsed(prev => !prev)}
            title="Drag to resize terminal. Click to collapse or expand."
            className="my-1 flex h-2 cursor-row-resize items-center justify-center rounded bg-slate-900/80 text-slate-600 transition hover:bg-slate-800 hover:text-amber-400"
          >
            <GripHorizontal className="h-4 w-4" />
          </button>

          <div
            className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl transition-[height] duration-150"
            style={{ height: bottomCollapsed ? 42 : bottomHeight }}
          >
            <div className="flex-1 overflow-hidden">
              {bottomCollapsed ? (
                <div className="flex h-full items-center justify-between px-4 text-xs text-slate-500">
                  <span>Terminal collapsed</span>
                  <button onClick={() => setBottomCollapsed(false)} className="text-amber-400 hover:text-amber-300">
                    Expand
                  </button>
                </div>
              ) : (
                <OutputConsole
                  activeTab={activeConsoleTab}
                  setActiveTab={setActiveConsoleTab}
                  runResult={runResult}
                  submitResult={submitResult}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  examples={problem.examples}
                  problem={problem}
                  submissionHistory={submissionHistory}
                />
              )}
            </div>
            {!bottomCollapsed && (
              <ActionButtons
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                onRun={runCode}
                onSubmit={submitCode}
                onReset={resetCode}
                isCoachOpen={mentor.isOpen}
                onToggleCoach={mentor.toggleOpen}
              />
            )}
          </div>
        </div>

        {/* Right — Mentor Panel (slide in) */}
        {mentor.isOpen && (
          <div className="hidden h-full w-full overflow-hidden md:block md:w-[25%] animate-in slide-in-from-right-4 duration-200">
            <MentorPanel
              messages={mentor.messages}
              isLoading={mentor.isLoading}
              isOpen={mentor.isOpen}
              onClose={mentor.toggleOpen}
              onRequestHint={handleRequestHint}
              onSendMessage={mentor.sendMessage}
            />
          </div>
        )}
      </div>
    </main>
  );
}
