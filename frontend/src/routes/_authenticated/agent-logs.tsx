import { createFileRoute } from '@tanstack/react-router';
import { AgentLogsPage } from '@/features/agent-logs/agent-logs-page';

export const Route = createFileRoute('/_authenticated/agent-logs')({
  component: AgentLogsPage,
});
