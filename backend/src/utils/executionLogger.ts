export interface ExecutionLog {
  timestamp: string;
  requestId?: string;
  method?: string;
  url?: string;
  request?: any;
  response?: any;
  status?: number;
  duration?: number;
  type?: string;
}

export const executionLogs: ExecutionLog[] = [];
