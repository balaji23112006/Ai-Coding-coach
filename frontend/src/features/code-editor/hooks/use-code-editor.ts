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
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcase' | 'result' | 'submissions'>('testcase');

  // Hook 1: Unified initialization (runs when problemId or user changes)
  useEffect(() => {
    let active = true;
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
        const latestSubmission = data.submissions && data.submissions.length > 0 ? data.submissions[0] : null;

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

      const subForLang = submissionHistory.find(s => s.language === selectedLanguage);

      setCurrentCode(draftCode ?? subForLang?.code ?? templates[selectedLanguage]);
      setRunResult(null);
      setSubmitResult(null);
      setActiveConsoleTab('testcase');
    }

    void loadCodeForLanguage();

    return () => {
      active = false;
    };
  }, [selectedLanguage, isInitializing]);

  useEffect(() => {
    if (isInitializing || !currentCode || currentCode === templates[selectedLanguage]) return;

    const timer = window.setTimeout(() => {
      void submissionService.saveDraft(problemId, selectedLanguage, currentCode, user?.id);
    }, 800);

    return () => window.clearTimeout(timer);
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

    try {
      const result = await submissionService.submitCode(problemId, selectedLanguage, currentCode);
      setSubmitResult(result);
      setSubmissionHistory((prev) => [result, ...prev]);

      // Update local stats dynamically
      setStats((prev) => {
        const isAccepted = result.status === 'Accepted' || result.status === 'ACCEPTED';
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
            acceptedCount: isAccepted ? prev.userStats.acceptedCount + 1 : prev.userStats.acceptedCount,
          },
        };
      });

      // Map into runResult shape for ResultsPanel/OutputConsole compatibility
      const executionResult: ExecutionResult = {
        status:
          result.status === 'Accepted' || result.status === 'ACCEPTED'
            ? 'Success'
            : result.status === 'Compile Error' || result.status === 'COMPILATION_ERROR'
              ? 'Compile Error'
              : result.status === 'Runtime Error' || result.status === 'RUNTIME_ERROR'
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
  };
}
