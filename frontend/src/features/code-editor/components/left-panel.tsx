import type { Submission } from '../types/editor-types';
import type { Problem } from '../types/editor-types';
import { ProblemPanel } from './problem-panel';

interface LeftPanelProps {
  problem: Problem;
  submissionHistory: Submission[];
  latestSubmission: Submission | null;
  stats?: unknown;
  loadSubmittedCode?: (code: string) => void;
}

export function LeftPanel({
  problem,
  submissionHistory,
  latestSubmission,
  stats,
  loadSubmittedCode,
}: LeftPanelProps) {
  void submissionHistory;
  void latestSubmission;
  void stats;
  void loadSubmittedCode;

  return <ProblemPanel problem={problem} />;
}
