export interface ExecutionLog {
  timestamp: string;
  requestId: string;
  type: 'run' | 'submit';
  request: any;
  response: any;
}

export const executionLogs: ExecutionLog[] = [];
