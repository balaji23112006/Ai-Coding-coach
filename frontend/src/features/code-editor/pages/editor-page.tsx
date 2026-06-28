import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  BrainCircuit,
  AlertTriangle,
  Loader2,
  GripHorizontal,
  GripVertical,
  Send,
  Trophy,
  Sparkles,
} from 'lucide-react';

import { ActionButtons } from '../components/action-buttons';
import { CodeEditor } from '../components/code-editor';
import { LanguageSelector } from '../components/language-selector';
import { LeftPanel } from '../components/left-panel';
import { MentorPanel } from '../components/mentor-panel';
import { OutputConsole } from '../components/output-console';
import { useCodeEditor } from '../hooks/use-code-editor';
import { useMentor } from '../hooks/use-mentor';
import type { Problem, ExecutionResult } from '../types/editor-types';
import { useAuth } from '@/features/authentication';
import { EvaluationPanel } from '../components/evaluation-panel';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BackendProblem {
  id: string;
  slug?: string;
  title?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  acceptance_rate?: number;
  description?: string;
  constraints?: string[];
  test_cases?: {
    input: string;
    expected_output: string;
    is_hidden: boolean;
    explanation?: string;
  }[];
  hints?: string[];
  explanation?: string;
  starter_code?: {
    javascript?: string;
    python?: string;
    typescript?: string;
    java?: string;
    cpp?: string;
  };
  time_limit?: number;
  memory_limit?: number;
}

function mapBackendToEditorProblem(q: BackendProblem): Problem {
  const sampleCases = (q.test_cases || [])
    .filter((tc) => !tc.is_hidden)
    .map((tc, index: number) => ({
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
    acceptance: q.acceptance_rate ?? 0.0,
    description: q.description || '',
    constraints: q.constraints || [],
    examples: sampleCases,
    hints: q.hints || [],
    explanation: q.explanation || '',
    testCases: (q.test_cases || []).map((tc) => ({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(
    () => Number(window.sessionStorage.getItem('skill-lens:editor:left-width')) || 38,
  );
  const [bottomHeight, setBottomHeight] = useState(
    () => Number(window.sessionStorage.getItem('skill-lens:editor:bottom-height')) || 260,
  );
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { user } = useAuth();
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showRecommendationPopup, setShowRecommendationPopup] = useState(false);
  const [hasDismissedRecommendation, setHasDismissedRecommendation] = useState(false);

  const {
    isCodeLoading,
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
    isLoadingRecommendations,
    recommendations,
    recommendationExplanation,
    mistakeAnalysis,
    recommendationError,
    showRecommendationUI,
    setShowRecommendationUI,
  } = useCodeEditor(problem.id, problem.templates);

  const mentor = useMentor({
    problemId: problem.id,
    problemTitle: problem.title,
    currentCode,
    language: selectedLanguage,
    executionResult: runResult,
  });

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


  // Celebration on Accepted & trigger Recommendation Popup
  useEffect(() => {
    if (submitResult?.status === 'Accepted') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 4000);

      let timer: number | undefined;
      if (!hasDismissedRecommendation) {
        timer = window.setTimeout(() => {
          setShowRecommendationPopup(true);
        }, 3500);
      }
      
      return () => {
        clearTimeout(t);
        if (timer) clearTimeout(timer);
      };
    }
  }, [submitResult?.id, submitResult?.status, hasDismissedRecommendation]);

  // Reset popup states on problem change
  useEffect(() => {
    setHasDismissedRecommendation(false);
    setShowRecommendationPopup(false);
  }, [problem.id]);

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
    let solvedIds: string[];
    try {
      solvedIds = JSON.parse(window.localStorage.getItem(key) || '[]') as string[];
    } catch {
      solvedIds = [];
    }

    const next = solvedIds.includes(problem.id) ? solvedIds : [...solvedIds, problem.id];
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('skill-lens:practice-progress-updated', {
        detail: { problemId: problem.id, solvedQuestionIds: next },
      }),
    );
    window.dispatchEvent(
      new CustomEvent('skill-lens:dashboard-refresh-requested', {
        detail: { problemId: problem.id },
      }),
    );
    window.dispatchEvent(
      new CustomEvent('skill-lens:leaderboard-refresh-requested', {
        detail: { problemId: problem.id },
      }),
    );
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

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-in zoom-in-50 fade-in flex flex-col items-center gap-4 rounded-3xl border border-emerald-500/30 bg-slate-950/90 px-12 py-8 shadow-2xl shadow-emerald-900/40 backdrop-blur-xl duration-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/50">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-black tracking-tight text-emerald-400">Accepted! 🎉</p>
              <p className="mt-1 text-sm text-slate-400">
                All test cases passed. Outstanding work!
              </p>
            </div>
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-emerald-400"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Popup overlay — appears after celebration ends */}
      {showRecommendationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="animate-in zoom-in-95 fade-in w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-950 p-6 shadow-2xl shadow-cyan-900/20 duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-900/40">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    AI Recommendation
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse">
                    🎯 Next Problem
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHasDismissedRecommendation(true);
                  setShowRecommendationPopup(false);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              {!showRecommendationUI ? (
                <div className="text-center space-y-5">
                  <p className="text-sm text-slate-300">
                    Your code was accepted! Would you like an AI recommendation for your next problem based on your performance?
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowRecommendationUI(true)}
                      className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggest next problem
                    </button>
                    <button
                      onClick={() => {
                        setHasDismissedRecommendation(true);
                        setShowRecommendationPopup(false);
                      }}
                      className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-300"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isLoadingRecommendations ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-cyan-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-xs font-semibold animate-pulse">Analyzing and generating recommendation...</span>
                    </div>
                  ) : recommendationError ? (
                    <div className="py-4 text-center text-sm text-rose-400">
                      {recommendationError}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="space-y-4 text-slate-300">
                      {mistakeAnalysis && mistakeAnalysis.primaryMistake !== "None" && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                              Detected Learning Gap: {mistakeAnalysis.primaryMistake}
                            </p>
                          </div>
                          {mistakeAnalysis.evidence?.length > 0 && (
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
                              Reason: {mistakeAnalysis.evidence[0]}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-lg font-bold text-white mb-2">
                          {recommendations[0]?.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              recommendations[0]?.difficulty === 'Easy'
                                ? 'bg-green-500/10 text-green-400'
                                : recommendations[0]?.difficulty === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400',
                            )}
                          >
                            {recommendations[0]?.difficulty || 'Medium'}
                          </span>
                          {(recommendations[0]?.topics || []).slice(0, 3).map((topic: string) => (
                            <span
                              key={topic}
                              className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Explanation:
                        </p>
                        <p className="text-sm leading-relaxed text-slate-400">
                          {recommendationExplanation}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowRecommendationPopup(false);
                            navigate({ to: '/editor/$problemSlug', params: { problemSlug: recommendations[0]?.slug } });
                          }}
                          className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-900/30 transition hover:from-cyan-400 hover:to-blue-500"
                        >
                          Solve Next Problem →
                        </button>
                        <button
                          onClick={() => {
                            setHasDismissedRecommendation(true);
                            setShowRecommendationPopup(false);
                          }}
                          className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-slate-400">
                      No recommendations available at this time.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-3">
          {/* Submission Counter */}
          {submissionHistory.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 px-2.5 py-1">
              <Send className="h-3 w-3 text-slate-500" />
              <span className="font-mono text-[10px] font-bold text-slate-400">
                {submissionHistory.length}
              </span>
              <span className="font-mono text-[9px] text-slate-600">
                {submissionHistory.length === 1 ? 'attempt' : 'attempts'}
              </span>
            </div>
          )}

          {/* Accepted badge */}
          {submitResult?.status === 'Accepted' && (
            <div className="flex animate-pulse items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1">
              <Trophy className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-[10px] font-bold text-emerald-400">Accepted</span>
            </div>
          )}
          {/* Mentor Toggle Button */}
          <button
            id="mentor-toggle-btn"
            onClick={() => {
              setShowEvaluation(false);
              mentor.toggleOpen();
            }}
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
                {mentor.messages.filter((m) => m.role === 'mentor').length}
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
              loadSubmittedCode={handleCodeChange}
              totalSubmissions={stats?.userStats?.attempts ?? 0}
              acceptanceRate={stats?.globalStats?.acceptanceRate}
            />
          )}
        </div>

        <button
          onMouseDown={startHorizontalResize}
          onClick={() => setLeftCollapsed((prev) => !prev)}
          title="Drag to resize problem panel. Click to collapse or expand."
          className="mx-1 flex w-2 cursor-col-resize items-center justify-center rounded bg-slate-900/80 text-slate-600 transition hover:bg-slate-800 hover:text-amber-400"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Center — Code Editor + Console */}
        <div
          ref={centerRef}
          className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 md:h-full"
        >
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <CodeEditor
                language={selectedLanguage}
                value={currentCode}
                onChange={handleCodeChange}
                isCodeLoading={isCodeLoading}
              />
            </div>
          </div>

          <button
            onMouseDown={startVerticalResize}
            onClick={() => setBottomCollapsed((prev) => !prev)}
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
                  <button
                    onClick={() => setBottomCollapsed(false)}
                    className="text-amber-400 hover:text-amber-300"
                  >
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
                isSubmitting={isSubmitting || isEvaluating}
                onRun={runCode}
                onSubmit={() => {
                  if (mentor.isOpen) {
                    mentor.toggleOpen();
                  }
                  setShowEvaluation(true);
                }}
                onReset={resetCode}
                isCoachOpen={mentor.isOpen}
                onToggleCoach={() => {
                  setShowEvaluation(false);
                  mentor.toggleOpen();
                }}
              />
            )}
          </div>
        </div>

        {/* Right — Mentor Panel (slide in) */}
        {mentor.isOpen && (
          <div className="animate-in slide-in-from-right-4 hidden h-full w-full shrink-0 overflow-hidden duration-200 md:block md:w-[25%]">
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

        {/* Right — Evaluation Panel (slide in) */}
        {showEvaluation && (
          <div className="animate-in slide-in-from-right-4 hidden h-full w-full shrink-0 overflow-hidden duration-200 md:block md:w-[25%]">
            <EvaluationPanel
              problemId={problem.id}
              submittedCode={currentCode}
              testCases={problem.testCases}
              userId={user?.id || 'anonymous'}
              language={selectedLanguage}
              onClose={() => setShowEvaluation(false)}
              isEvaluating={isEvaluating}
              setIsEvaluating={setIsEvaluating}
            />
          </div>
        )}
      </div>
    </main>
  );
}
