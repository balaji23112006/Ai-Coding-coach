import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AgentLogsPage } from '@/features/agent-logs/agent-logs-page';
import { useAuth } from '@/features/authentication';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authenticated/agent-logs')({
  component: AgentLogsComponent,
});

function AgentLogsComponent() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      void navigate({ to: '/dashboard' });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || user?.role !== 'admin') {
    return null;
  }

  return <AgentLogsPage />;
}
