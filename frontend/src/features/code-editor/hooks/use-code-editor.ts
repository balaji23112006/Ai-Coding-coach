import { useEffect, useMemo, useState } from 'react';
import type { ExecutionResult, Submission, SupportedLanguage } from '../types/editor-types';
import { submissionService, type SubmissionStats } from '../services/submission-service';

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
  const templates = useMemo(
    () => ({ ...STARTER_TEMPLATES, ...customTemplates }),
    [customTemplates],
  );

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('javascript');
  const [currentCode, setCurrentCode] = useState<string>(templates.javascript);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [submitResult, setSubmitResult] = useState<Submission | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcase' | 'result' | 'submissions'>('testcase');

  useEffect(() => {
    let active = true;

    async function loadHistoryAndStats() {
      const data = await submissionService.getSubmissions(problemId);
      if (!active) return;
      setSubmissionHistory(data.submissions);
      setStats({
        userStats: data.userStats,
        globalStats: data.globalStats,
      });
    }

    void loadHistoryAndStats();

    return () => {
      active = false;
    };
  }, [problemId]);

  useEffect(() => {
    let active = true;

    async function loadDraftOrTemplate() {
      const draftCode = await submissionService.getDraft(problemId, selectedLanguage);
      if (!active) return;
      setCurrentCode(draftCode ?? templates[selectedLanguage]);
      setRunResult(null);
      setSubmitResult(null);
      setActiveConsoleTab('testcase');
    }

    void loadDraftOrTemplate();

    return () => {
      active = false;
    };
  }, [problemId, selectedLanguage, templates]);

  useEffect(() => {
    if (!currentCode || currentCode === templates[selectedLanguage]) return;

    const timer = window.setTimeout(() => {
      void submissionService.saveDraft(problemId, selectedLanguage, currentCode);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [currentCode, problemId, selectedLanguage, templates]);

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
      setSubmissionHistory(prev => [result, ...prev]);
      // Switch to submissions tab after judging so user sees history
      setActiveConsoleTab('submissions');

      // Also mirror into runResult shape for ResultsPanel compatibility
      const executionResult: ExecutionResult = {
        status:
          result.status === 'Accepted'
            ? 'Success'
            : result.status === 'Compile Error'
              ? 'Compile Error'
              : result.status === 'Runtime Error'
                ? 'Runtime Error'
                : 'Wrong Answer',
        stderr: result.stderr,
        stdout: result.stdout,
        runtime: result.runtime,
        memory: result.memory,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
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
      setSubmissionHistory(prev => [errResult, ...prev]);
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
