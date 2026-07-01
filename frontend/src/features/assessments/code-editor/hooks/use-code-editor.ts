import { useEffect, useMemo, useState } from 'react';
import type { ExecutionResult, Submission, SupportedLanguage } from '../types/editor-types';
import { submissionService, type SubmissionStats } from '../services/submission-service';
import { useAuth } from '@/features/authentication';

const STARTER_TEMPLATES: Record<SupportedLanguage, string> = {
  javascript: `function solve() {\n  // Write your JavaScript solution here\n}`,
  typescript: `function solve(): void {\n  // Write your TypeScript solution here\n}`,
  python: `class Solution:\n    def solve(self):\n        pass\n`,
  java: `class Solution {\n    public void solve() {\n        \n    }\n}`,
  cpp: `class Solution {\npublic:\n    void solve() {\n        \n    }\n};`,
};

export function useCodeEditor(
  problemId: string,
  customTemplates?: Partial<Record<SupportedLanguage, string>>,
) {
  const { user } = useAuth();
  const templates = useMemo(
    () => ({ ...STARTER_TEMPLATES, ...customTemplates }),
    [customTemplates],
  );

  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('javascript');
  const [currentCode, setCurrentCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [submitResult, setSubmitResult] = useState<Submission | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcase' | 'result' | 'submissions'>(
    'testcase',
  );

  // On-demand recommendation state
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationExplanation, setRecommendationExplanation] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mistakeAnalysis, setMistakeAnalysis] = useState<any>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  
  // Controls whether the user chose to view the recommendation
  const [showRecommendationUI, setShowRecommendationUI] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<number | null>(null);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalId) window.clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  // Hook 1: Unified initialization (runs when problemId or user changes)
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsInitializing(true);

    async function initialize() {
      try {
        const data = await submissionService.getSubmissions(problemId);
        if (!active) return;

        setSubmissionHistory(data.submissions);
        setStats({
          userStats: data.userStats,
          globalStats: data.globalStats,
        });

        // Determine the initial language and code to load
        let initialLang = selectedLanguage;
        const latestSubmission =
          data.submissions && data.submissions.length > 0 ? data.submissions[0] : null;

        if (latestSubmission && latestSubmission.language) {
          initialLang = latestSubmission.language as SupportedLanguage;
        }

        const draftCode = await submissionService.getDraft(problemId, initialLang, user?.id);
        if (!active) return;

        setSelectedLanguage(initialLang);
        setCurrentCode(draftCode ?? latestSubmission?.code ?? templates[initialLang]);
        setRunResult(null);
        setSubmitResult(null);
        setActiveConsoleTab('testcase');
      } catch (err) {
        console.error('Failed to initialize code editor', err);
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [problemId, user?.id]);

  // Hook 2: Load code when language changes, only after initial load is complete
  useEffect(() => {
    if (isInitializing) return;

    let active = true;

    async function loadCodeForLanguage() {
      const draftCode = await submissionService.getDraft(problemId, selectedLanguage, user?.id);
      if (!active) return;

      const subForLang = submissionHistory.find((s) => s.language === selectedLanguage);

      setCurrentCode(draftCode ?? subForLang?.code ?? templates[selectedLanguage]);
      setRunResult(null);
      setSubmitResult(null);
      setActiveConsoleTab('testcase');
    }

    void loadCodeForLanguage();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage, isInitializing]);

  useEffect(() => {
    if (isInitializing || !currentCode || currentCode === templates[selectedLanguage]) return;

    const timer = window.setTimeout(() => {
      void submissionService.saveDraft(problemId, selectedLanguage, currentCode, user?.id);
    }, 800);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode, problemId, selectedLanguage, templates, user?.id, isInitializing]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
  };

  const handleCodeChange = (newCode: string) => {
    setCurrentCode(newCode);
  };

  const runCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('result');

    try {
      const result = await submissionService.runCode(problemId, selectedLanguage, currentCode);
      setRunResult(result);
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        stderr: err instanceof Error ? err.message : 'An unknown error occurred.',
        runtime: 0,
        memory: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    setIsSubmitting(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('result');
    // Reset recommendation state on new submission
    setRecommendations([]);
    setRecommendationExplanation('');
    setMistakeAnalysis(null);
    setRecommendationError(null);
    setShowRecommendationUI(false);
    if (pollIntervalId) {
      window.clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }

    try {
      const result = await submissionService.submitCode(problemId, selectedLanguage, currentCode);
      setSubmitResult(result);
      setSubmissionHistory((prev) => [result, ...prev]);

      // Trigger background recommendation fetch immediately upon Accepted
      if (result.status === 'Accepted' && user?.id && !isLoadingRecommendations) {
        setIsLoadingRecommendations(true);
        setRecommendationError(null);
        
        fetch('/api/ai/problem-recommendation/run-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch(err => {
          console.warn('Failed to start background recommendation', err);
          setIsLoadingRecommendations(false);
        });
      }

      // Update local stats dynamically
      setStats((prev) => {
        const isAccepted = result.status === 'Accepted';
        if (!prev) {
          return {
            userStats: {
              attempts: 1,
              acceptedCount: isAccepted ? 1 : 0,
              bestRuntime: result.runtime ?? null,
              avgRuntime: result.runtime ?? null,
              bestMemory: result.memory ?? null,
              avgMemory: result.memory ?? null,
              lowestMemory: result.memory ?? null,
            },
            globalStats: {
              totalCount: 1,
              acceptedCount: isAccepted ? 1 : 0,
              acceptanceRate: isAccepted ? 100 : 0,
            },
          };
        }
        return {
          ...prev,
          userStats: {
            ...prev.userStats,
            attempts: prev.userStats.attempts + 1,
            acceptedCount: isAccepted
              ? prev.userStats.acceptedCount + 1
              : prev.userStats.acceptedCount,
          },
        };
      });

      // Map into runResult shape for ResultsPanel/OutputConsole compatibility
      const executionResult: ExecutionResult = {
        status:
          result.status === 'Accepted'
            ? 'Success'
            : result.status === 'Compile Error'
              ? 'Compile Error'
              : result.status === 'Runtime Error'
                ? 'Runtime Error'
                : 'Wrong Answer',
        stdout: result.stdout,
        stderr: result.stderr,
        runtime: result.runtime,
        memory: result.memory,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        failedCases: result.failedCases,
      };
      setRunResult(executionResult);
    } catch (err) {
      const errResult: Submission = {
        id: crypto.randomUUID(),
        problemId,
        language: selectedLanguage,
        code: currentCode,
        status: 'Runtime Error',
        submittedAt: new Date().toISOString(),
        stderr: err instanceof Error ? err.message : 'An unknown error occurred.',
      };
      setSubmitResult(errResult);
      setSubmissionHistory((prev) => [errResult, ...prev]);

      // Update local stats dynamically for errors
      setStats((prev) => {
        if (!prev) {
          return {
            userStats: {
              attempts: 1,
              acceptedCount: 0,
              bestRuntime: null,
              avgRuntime: null,
              bestMemory: null,
              avgMemory: null,
              lowestMemory: null,
            },
            globalStats: {
              totalCount: 1,
              acceptedCount: 0,
              acceptanceRate: 0,
            },
          };
        }
        return {
          ...prev,
          userStats: {
            ...prev.userStats,
            attempts: prev.userStats.attempts + 1,
          },
        };
      });

      setRunResult({
        status: 'Runtime Error',
        stderr: errResult.stderr,
        runtime: 0,
        memory: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  // Poll for recommendation from the backend agent
  useEffect(() => {
    if (!showRecommendationUI || !user?.id) return;

    if (recommendations.length > 0 || recommendationError) return;

    setIsLoadingRecommendations(true);

    let active = true;
    let timerId: number | null = null;
    let pollAttempts = 0;

    const poll = async () => {
      try {
        const res = await fetch('/api/ai/problem-recommendation/latest', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch recommendation');
        const json = await res.json();
        const data = json.success ? json.data : null;
        const isUpdating = json.success ? json.isUpdating : false;

        if (!active) return;

        if (data && !isUpdating) {
          // Found completed recommendation
          setRecommendations(data.recommendations || []);
          setRecommendationExplanation(data.explanation || '');
          setMistakeAnalysis(data.mistakeAnalysis || null);
          setIsLoadingRecommendations(false);
        } else {
          // If still updating or no recommendation found, poll again up to 20 times (60 seconds)
          if (pollAttempts < 20) {
            pollAttempts++;
            timerId = window.setTimeout(poll, 3000);
          } else {
            setRecommendationError('Recommendation generation timed out.');
            setIsLoadingRecommendations(false);
          }
        }
      } catch (err) {
        if (!active) return;
        setRecommendationError('Failed to fetch recommendation.');
        setIsLoadingRecommendations(false);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [showRecommendationUI, user?.id, recommendations.length, recommendationError]);

  const resetCode = () => {
    setCurrentCode(templates[selectedLanguage]);
    setRunResult(null);
    setSubmitResult(null);
    setActiveConsoleTab('testcase');
  };

  return {
    isCodeLoading: isInitializing,
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
    // Recommendations
    isLoadingRecommendations,
    recommendations,
    recommendationExplanation,
    mistakeAnalysis,
    recommendationError,
    showRecommendationUI,
    setShowRecommendationUI,
  };
}

