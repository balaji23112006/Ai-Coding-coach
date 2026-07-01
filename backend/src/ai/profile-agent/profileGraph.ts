import { StateGraph, START, END } from '@langchain/langgraph';
import { ProfileAgentState } from './state.js';
import { langfuse } from '../../providers/langfuse/index.js';
import { agentLogger } from './services/AgentLogger.js';
import {
  getUserHistory,
  getTopicStats,
  getSubmissions,
  getRecentActivity,
  saveProfile,
} from './tools/index.js';
import {
  routeHistorySufficient,
  routeHistoryAlternative,
  routeTopicStatsAvailable,
  routeTopicStatsAlternative,
  routeSubmissionsMeaningful,
  routeSubmissionsAlternative,
  routeRecentActivityAvailable,
  routeRecentActivityAlternative,
  routeProfileChangedSignificantly,
} from './nodes/decisions.js';
import {
  analyzeMasteryNode,
  detectTrendsNode,
  assessDifficultyNode,
  classifyLevelNode,
  identifyStrengthsNode,
  identifyWeaknessesNode,
  generateRecommendationsNode,
} from './nodes/analysis.js';
import { bootstrapNode } from './nodes/bootstrap.js';

// --- Langfuse Tracing Helpers ---

/**
 * Traces a LangGraph node execution.
 */
async function traceNode<T>(
  nodeName: string,
  state: { userId: string; traceId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = state.traceId;
  if (traceId) {
    agentLogger.logNodeExecution(traceId, nodeName);
  }

  const trace = langfuse.trace({
    id: state.traceId || undefined,
    name: 'profile-agent-workflow',
    userId: state.userId,
    tags: ['profile agent'],
    release: 'profile agent',
  });

  const span = trace.span({
    name: `node:${nodeName}`,
    input: { userId: state.userId },
  });

  try {
    const result = await fn();
    span.end({
      output: result,
    });
    langfuse.flushAsync().catch(console.error);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    span.update({
      level: 'ERROR',
      statusMessage: err.message,
    });
    span.end({
      output: { error: err.message },
    });
    trace.update({
      output: { error: err.message },
    });
    langfuse.flushAsync().catch(console.error);
    throw error;
  }
}

/**
 * Traces a database tool execution.
 */
async function traceTool<T>(
  toolName: string,
  state: { userId: string; traceId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = state.traceId;
  if (traceId) {
    agentLogger.logNodeExecution(traceId, `tool:${toolName}`);
  }

  const trace = langfuse.trace({
    id: state.traceId || undefined,
    name: 'profile-agent-workflow',
    userId: state.userId,
    tags: ['profile agent'],
    release: 'profile agent',
  });

  const span = trace.span({
    name: `tool:${toolName}`,
    input: { userId: state.userId },
  });

  try {
    const result = await fn();
    span.end({
      output: result,
    });
    langfuse.flushAsync().catch(console.error);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    span.update({
      level: 'ERROR',
      statusMessage: err.message,
    });
    span.end({
      output: { error: err.message },
    });
    langfuse.flushAsync().catch(console.error);
    throw error;
  }
}

// --- Traced Node Wrappers ---

const bootstrapNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  const traceId = state.traceId || `trace-${state.userId}-${Date.now()}`;
  const stateWithTrace = { ...state, traceId };

  const result = await traceNode('bootstrap', stateWithTrace, () => bootstrapNode(state));
  return {
    ...result,
    traceId,
  };
};

const getUserHistoryNodeFn = async (state: typeof ProfileAgentState.State) => {
  const traceId = state.traceId || `trace-${state.userId}-${Date.now()}`;
  const stateWithTrace = { ...state, traceId };

  return await traceNode('getUserHistoryNode', stateWithTrace, async () => {
    const result = await traceTool('getUserHistory', stateWithTrace, () =>
      getUserHistory(state.userId),
    );
    return {
      history: result,
      toolsTried: ['getUserHistory'],
      traceId,
    };
  });
};

const getTopicStatsNodeFn = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('getTopicStatsNode', state, async () => {
    const result = await traceTool('getTopicStats', state, () => getTopicStats(state.userId));
    return {
      topicStats: result,
      toolsTried: ['getTopicStats'],
    };
  });
};

const getSubmissionsNodeFn = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('getSubmissionsNode', state, async () => {
    const result = await traceTool('getSubmissions', state, () =>
      getSubmissions({ userId: state.userId }),
    );
    return {
      submissions: result,
      toolsTried: ['getSubmissions'],
    };
  });
};

const getRecentActivityNodeFn = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('getRecentActivityNode', state, async () => {
    const result = await traceTool('getRecentActivity', state, () =>
      getRecentActivity(state.userId),
    );
    return {
      recentActivity: result,
      toolsTried: ['getRecentActivity'],
    };
  });
};

const saveProfileNodeFn = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('saveProfileNode', state, async () => {
    const payload = {
      userId: state.userId,
      skills: state.mastery,
      solvedCount: state.solvedCount,
      easySolved: state.easySolved,
      mediumSolved: state.mediumSolved,
      hardSolved: state.hardSolved,
      learningTrack: state.history?.profile?.learningTrack || null,
      experienceLevel: state.level,
      recommendedFocus: state.recommendedFocus || null,
      recommendedDifficulty: state.recommendedDifficulty || null,
    };

    await traceTool('saveProfile', state, () => saveProfile(payload));

    return {
      profileStatus: 'SAVED',
      toolsTried: ['saveProfile'],
    };
  });
};

const analyzeMasteryNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('analyzeMasteryNode', state, () => analyzeMasteryNode(state));
};

const detectTrendsNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('detectTrendsNode', state, () => detectTrendsNode(state));
};

const assessDifficultyNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('assessDifficultyNode', state, () => assessDifficultyNode(state));
};

const classifyLevelNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('classifyLevelNode', state, () => classifyLevelNode(state));
};

const identifyStrengthsNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('identifyStrengthsNode', state, () => identifyStrengthsNode(state));
};

const identifyWeaknessesNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('identifyWeaknessesNode', state, () => identifyWeaknessesNode(state));
};

const generateRecommendationsNodeWrapped = async (state: typeof ProfileAgentState.State) => {
  return await traceNode('generateRecommendationsNode', state, () =>
    generateRecommendationsNode(state),
  );
};

// --- Resolver Helpers for Conditional Routing ---

const resolveHistoryCheck = (state: typeof ProfileAgentState.State) => {
  const sufficiency = routeHistorySufficient(state);
  const traceId = state.traceId;
  if (sufficiency === 'checkTopicStats') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D1 (History sufficiency check): Solved count/submissions sufficient. Routing to Topic Stats check.`,
      );
    }
    return 'getTopicStatsNode';
  }
  const alt = routeHistoryAlternative(state);
  if (alt === 'getUserHistoryNode') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D1 (History sufficiency check): Insufficient history. getUserHistory tool not tried yet. Routing to getUserHistoryNode.`,
      );
    }
    return 'getUserHistoryNode';
  }
  if (alt === 'checkTopicStats') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D1 (History sufficiency check): Insufficient history but tool already tried. Proceeding to Topic Stats check.`,
      );
    }
    return 'getTopicStatsNode';
  }
  if (traceId) {
    agentLogger.logDecision(
      traceId,
      `D1 (History sufficiency check): Insufficient history and getUserHistory tool already tried. Routing to bootstrap.`,
    );
  }
  return 'bootstrap';
};

const resolveTopicStatsCheck = (state: typeof ProfileAgentState.State) => {
  const availability = routeTopicStatsAvailable(state);
  const traceId = state.traceId;
  if (availability === 'checkSubmissions') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D2 (Topic stats check): Sufficient topic stats found. Routing to Submissions check.`,
      );
    }
    return 'getSubmissionsNode';
  }
  const alt = routeTopicStatsAlternative(state);
  if (alt === 'getTopicStatsNode') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D2 (Topic stats check): Topic stats missing. getTopicStats tool not tried yet. Routing to getTopicStatsNode.`,
      );
    }
    return 'getTopicStatsNode';
  }
  if (alt === 'checkSubmissions') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D2 (Topic stats check): Topic stats missing but tool already tried. Proceeding to Submissions check.`,
      );
    }
    return 'getSubmissionsNode';
  }
  if (traceId) {
    agentLogger.logDecision(
      traceId,
      `D2 (Topic stats check): Topic stats missing and tool already tried. Routing to bootstrap.`,
    );
  }
  return 'bootstrap';
};

const resolveSubmissionsCheck = (state: typeof ProfileAgentState.State) => {
  const meaningful = routeSubmissionsMeaningful(state);
  const traceId = state.traceId;
  if (meaningful === 'checkRecentActivity') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D3 (Submissions check): Meaningful submissions list found. Routing to Recent Activity check.`,
      );
    }
    return 'getRecentActivityNode';
  }
  const alt = routeSubmissionsAlternative(state);
  if (alt === 'getSubmissionsNode') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D3 (Submissions check): Submissions missing. getSubmissions tool not tried yet. Routing to getSubmissionsNode.`,
      );
    }
    return 'getSubmissionsNode';
  }
  if (alt === 'checkRecentActivity') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D3 (Submissions check): Submissions missing/insufficient but tool already tried. Proceeding to Recent Activity check.`,
      );
    }
    return 'getRecentActivityNode';
  }
  if (traceId) {
    agentLogger.logDecision(
      traceId,
      `D3 (Submissions check): Submissions missing and tool already tried. Routing to bootstrap.`,
    );
  }
  return 'bootstrap';
};

const resolveRecentActivityCheck = (state: typeof ProfileAgentState.State) => {
  const available = routeRecentActivityAvailable(state);
  const traceId = state.traceId;
  if (available === 'checkProfileChange') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D4 (Recent activity check): Sufficient activity stream found. Routing to analyzeMasteryNode.`,
      );
    }
    return 'analyzeMasteryNode';
  }
  const alt = routeRecentActivityAlternative(state);
  if (alt === 'getRecentActivityNode') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D4 (Recent activity check): Recent activity missing. getRecentActivity tool not tried yet. Routing to getRecentActivityNode.`,
      );
    }
    return 'getRecentActivityNode';
  }
  if (alt === 'checkProfileChange') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D4 (Recent activity check): Recent activity missing/insufficient but tool already tried. Proceeding to analyzeMasteryNode.`,
      );
    }
    return 'analyzeMasteryNode';
  }
  if (traceId) {
    agentLogger.logDecision(
      traceId,
      `D4 (Recent activity check): Recent activity missing and tool already tried. Routing to bootstrap.`,
    );
  }
  return 'bootstrap';
};

const resolveProfileChangeCheck = (state: typeof ProfileAgentState.State) => {
  const next = routeProfileChangedSignificantly(state);
  const traceId = state.traceId;
  if (next === 'saveProfileNode') {
    if (traceId) {
      agentLogger.logDecision(
        traceId,
        `D7 (Significance check): Calculated profile metrics differ significantly from baseline. Routing to saveProfileNode.`,
      );
    }
    return 'saveProfileNode';
  }
  if (traceId) {
    agentLogger.logDecision(
      traceId,
      `D7 (Significance check): No significant change in profile metrics. Routing to END.`,
    );
  }
  return END;
};

// --- Assemble StateGraph ---

export const workflow = new StateGraph(ProfileAgentState)
  // Register Wrapped Nodes
  .addNode('bootstrap', bootstrapNodeWrapped)
  .addNode('getUserHistoryNode', getUserHistoryNodeFn)
  .addNode('getTopicStatsNode', getTopicStatsNodeFn)
  .addNode('getSubmissionsNode', getSubmissionsNodeFn)
  .addNode('getRecentActivityNode', getRecentActivityNodeFn)
  .addNode('analyzeMasteryNode', analyzeMasteryNodeWrapped)
  .addNode('detectTrendsNode', detectTrendsNodeWrapped)
  .addNode('assessDifficultyNode', assessDifficultyNodeWrapped)
  .addNode('classifyLevelNode', classifyLevelNodeWrapped)
  .addNode('identifyStrengthsNode', identifyStrengthsNodeWrapped)
  .addNode('identifyWeaknessesNode', identifyWeaknessesNodeWrapped)
  .addNode('generateRecommendationsNode', generateRecommendationsNodeWrapped)
  .addNode('saveProfileNode', saveProfileNodeFn);

// Connect nodes and edges
export const profileGraph = workflow
  // 1. Entry point
  .addEdge(START, 'getUserHistoryNode')

  // 2. Fetch evaluation loops and dependency checks
  .addConditionalEdges('getUserHistoryNode', resolveHistoryCheck, {
    getUserHistoryNode: 'getUserHistoryNode',
    getTopicStatsNode: 'getTopicStatsNode',
    bootstrap: 'bootstrap',
  })
  .addConditionalEdges('getTopicStatsNode', resolveTopicStatsCheck, {
    getTopicStatsNode: 'getTopicStatsNode',
    getSubmissionsNode: 'getSubmissionsNode',
    bootstrap: 'bootstrap',
  })
  .addConditionalEdges('getSubmissionsNode', resolveSubmissionsCheck, {
    getSubmissionsNode: 'getSubmissionsNode',
    getRecentActivityNode: 'getRecentActivityNode',
    bootstrap: 'bootstrap',
  })
  .addConditionalEdges('getRecentActivityNode', resolveRecentActivityCheck, {
    getRecentActivityNode: 'getRecentActivityNode',
    analyzeMasteryNode: 'analyzeMasteryNode',
    bootstrap: 'bootstrap',
  })

  // 3. New User bootstrap path handling
  .addEdge('bootstrap', 'saveProfileNode')

  // 4. Analysis Node Pipeline
  .addEdge('analyzeMasteryNode', 'detectTrendsNode')
  .addEdge('detectTrendsNode', 'assessDifficultyNode')
  .addEdge('assessDifficultyNode', 'classifyLevelNode')
  .addEdge('classifyLevelNode', 'identifyStrengthsNode')
  .addEdge('identifyStrengthsNode', 'identifyWeaknessesNode')
  .addEdge('identifyWeaknessesNode', 'generateRecommendationsNode')

  // 5. Profiler change evaluation & saving
  .addConditionalEdges('generateRecommendationsNode', resolveProfileChangeCheck, {
    saveProfileNode: 'saveProfileNode',
    [END]: END,
  })

  // 6. Terminate after save
  .addEdge('saveProfileNode', END)

  // Compile graph
  .compile();
