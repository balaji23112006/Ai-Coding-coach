import fs from 'fs';
import path from 'path';

export interface LogPrompt {
  type: string;
  prompt: string;
  response: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  trigger: string;
  status: 'running' | 'completed' | 'failed';
  decisions: string[];
  nodes: string[];
  prompts: LogPrompt[];
  request: any;
  response: any;
  error?: string;
}

class AgentLogger {
  private logFilePath: string;
  private currentRuns: Map<string, LogEntry> = new Map();

  constructor() {
    // Determine target file inside <cwd>/data/agent-logs.json
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('[AgentLogger] Failed to create data directory:', err);
      }
    }
    this.logFilePath = path.join(dataDir, 'agent-logs.json');
  }

  private readLogsFromFile(): LogEntry[] {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const fileContent = fs.readFileSync(this.logFilePath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('[AgentLogger] Error reading logs file:', err);
    }
    return [];
  }

  private writeLogsToFile(logs: LogEntry[]) {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
      console.error('[AgentLogger] Error writing logs file:', err);
    }
  }

  public startRun(userId: string, trigger: string = 'run', traceId?: string): string {
    const id = traceId || `run-${userId}-${Date.now()}`;
    const entry: LogEntry = {
      id,
      timestamp: new Date().toISOString(),
      userId,
      trigger,
      status: 'running',
      decisions: [],
      nodes: [],
      prompts: [],
      request: { userId, trigger },
      response: null,
    };
    this.currentRuns.set(id, entry);
    return id;
  }

  public logRequest(id: string, requestData: any) {
    const run = this.currentRuns.get(id);
    if (run) {
      run.request = requestData;
    }
  }

  public logDecision(id: string, decision: string) {
    const run = this.currentRuns.get(id);
    if (run) {
      run.decisions.push(`[${new Date().toISOString()}] ${decision}`);
    }
  }

  public logNodeExecution(id: string, nodeName: string, details?: any) {
    const run = this.currentRuns.get(id);
    if (run) {
      if (!run.nodes.includes(nodeName)) {
        run.nodes.push(nodeName);
      }
      run.decisions.push(
        `[${new Date().toISOString()}] Executed Node: ${nodeName}${details ? ` with data: ${JSON.stringify(details)}` : ''}`,
      );
    }
  }

  public logPrompt(id: string, type: string, promptText: string, responseText: string) {
    const run = this.currentRuns.get(id);
    if (run) {
      run.prompts.push({
        type,
        prompt: promptText,
        response: responseText,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public logResponse(id: string, responseData: any) {
    const run = this.currentRuns.get(id);
    if (run) {
      run.response = responseData;
    }
  }

  public async finalizeRun(
    id: string,
    status: 'completed' | 'failed' = 'completed',
    errorMsg?: string,
  ) {
    const run = this.currentRuns.get(id);
    if (!run) return;

    run.status = status;
    if (errorMsg) {
      run.error = errorMsg;
      run.decisions.push(`[${new Date().toISOString()}] Error encountered: ${errorMsg}`);
    }
    run.decisions.push(`[${new Date().toISOString()}] Run finalized: status = ${status}`);

    const logs = this.readLogsFromFile();
    // Insert newest at beginning
    logs.unshift(run);
    // Keep last 100 runs
    if (logs.length > 100) {
      logs.splice(100);
    }
    this.writeLogsToFile(logs);
    this.currentRuns.delete(id);
  }

  public getLogs(limit: number = 50): LogEntry[] {
    return this.readLogsFromFile().slice(0, limit);
  }
}

export const agentLogger = new AgentLogger();
