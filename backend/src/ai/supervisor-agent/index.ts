import 'dotenv/config';
import { runSupervisorWorkflow } from "./workflow.js";
import { shutdownSupervisorTracing } from '../../providers/langfuse/langchain.js';

async function main() {
  console.log("Initializing Supervisor Orchestration System Test...");

  // Example event emitted by the application or another agent.
  const initialInput = {
    userId: 'demo-user',
    sessionId: 'dev-test-session',
    eventType: 'request_problem' as const,
    context: { topic: 'dynamic-programming', failedAttempts: 0 },
    agentOutputs: {},
  };

  try {
    const finalState = await runSupervisorWorkflow(initialInput, {
      sessionId: 'dev-test-session',
    });

    console.log("\n--- Execution Complete ---");
    console.log('Decision:', finalState.decision);
    console.log('Workflow log:', finalState.decisions);

  } catch (error) {
    console.error("Workflow Execution Failed:", error);
    process.exitCode = 1;
  } finally {
    await shutdownSupervisorTracing();
  }
}

main();
