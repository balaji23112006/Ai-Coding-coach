import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, BrainCircuit, AlertTriangle, Loader2 } from 'lucide-react';

import { ActionButtons } from '../components/action-buttons';
import { CodeEditor } from '../components/code-editor';
import { LanguageSelector } from '../components/language-selector';
import { LeftPanel } from '../components/left-panel';
import { OutputConsole } from '../components/output-console';
import { useCodeEditor } from '../hooks/use-code-editor';
import type { Problem } from '../types/editor-types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20 blur-md" />
            <Loader2 className="relative h-10 w-10 animate-spin text-cyan-400" />
          </div>
          <div className="animate-pulse space-y-1.5 text-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Initializing Workspace
            </h3>
            <p className="text-[11px] text-slate-500">
              Preparing compiler and problem templates...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !problem) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#070a13] p-4 text-white">
        <Card className="relative w-full max-w-md overflow-hidden border-slate-800 bg-slate-950/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-[2px] w-full bg-rose-500" />
          <CardHeader className="pt-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-200">
              Failed to load workspace
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs text-slate-500">
              {error || 'The requested problem could not be found or fetched.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              asChild
              className="h-auto rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              <Link to="/practice">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                Back to Practice
              </Link>
            </Button>
          </CardContent>
        </Card>
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isRunning && !isSubmitting) {
          void runCode();
        }
      }
      // Ctrl+Shift+Enter or Cmd+Shift+Enter to submit code
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && !isSubmitting) {
          void submitCode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRunning, isSubmitting, runCode, submitCode]);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#070a13] text-white antialiased">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(148,163,184,0.06),_transparent_40%),radial-gradient(circle_at_70%_70%,_rgba(147,197,253,0.06),_transparent_40%)]" />

      <header className="relative z-30 flex h-9 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/20 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate({ to: '/practice' })}
                  className="duration-250 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-slate-700 hover:text-white"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Practice List</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="border-slate-800 bg-slate-950 text-[10px] text-slate-400">
                Back to Practice Selection
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
