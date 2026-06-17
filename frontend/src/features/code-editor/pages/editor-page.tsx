import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, BrainCircuit } from 'lucide-react';

import { ActionButtons } from '../components/action-buttons';
import { CodeEditor } from '../components/code-editor';
import { LanguageSelector } from '../components/language-selector';
import { LeftPanel } from '../components/left-panel';
import { OutputConsole } from '../components/output-console';
import { useCodeEditor } from '../hooks/use-code-editor';
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

        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl md:w-[38%]">
          <LeftPanel
            problem={problem}
            submissionHistory={submissionHistory}
            latestSubmission={submitResult}
            stats={stats}
            loadSubmittedCode={handleCodeChange}
          />
        </div>

        <div className="flex w-full flex-col gap-2 overflow-hidden md:h-full md:w-[62%]">
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <CodeEditor
                language={selectedLanguage}
                value={currentCode}
                onChange={handleCodeChange}
              />
            </div>
          </div>

          <div className="flex h-[260px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-xl">
            <div className="flex-1 overflow-hidden">
              <OutputConsole
                activeTab={activeConsoleTab}
                setActiveTab={setActiveConsoleTab}
                runResult={runResult}
                isRunning={isRunning}
                examples={problem.examples}
              />
            </div>
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
