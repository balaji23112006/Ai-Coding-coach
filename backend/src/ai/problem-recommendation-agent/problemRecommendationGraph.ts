import { START, END, StateGraph } from "@langchain/langgraph";

import { ProblemRecommendationState } from "./state.js";
import { agentLogger } from "../profile-agent/services/AgentLogger.js";

import { getProfileNode } from "./nodes/getProfile.node.js";
import { getSubmissionsNode } from "./nodes/getSubmissions.node.js";
import { analyzeSubmissionsNode } from "./nodes/analyzeSubmissions.node.js";
import { analyzeMistakesNode } from "./nodes/analyzeMistakes.node.js";
import { identifyWeakTopicsNode } from "./nodes/identifyWeakTopics.node.js";
import { determineDifficultyNode } from "./nodes/determineDifficulty.node.js";
import { searchProblemsNode } from "./nodes/searchProblems.node.js";
import { rankProblemsNode } from "./nodes/rankProblems.node.js";
import { generateExplanationNode } from "./nodes/generateExplanation.node.js";
import { generateRoadmapNode } from "./nodes/generateRoadmap.node.js";

function wrapNodeWithLogging(nodeName: string, nodeFn: any) {
  return async (state: any) => {
    const traceId = state.traceId;
    if (traceId) {
      agentLogger.logNodeExecution(traceId, nodeName);
    }
    const result = await nodeFn(state);
    return result;
  };
}

export const workflow = new StateGraph(
  ProblemRecommendationState
)
  .addNode("getProfile", wrapNodeWithLogging("getProfile", getProfileNode))
  .addNode("getSubmissions", wrapNodeWithLogging("getSubmissions", getSubmissionsNode))
  .addNode("analyzeSubmissions", wrapNodeWithLogging("analyzeSubmissions", analyzeSubmissionsNode))
  .addNode("analyzeMistakes", wrapNodeWithLogging("analyzeMistakes", analyzeMistakesNode))
  .addNode("identifyWeakTopics", wrapNodeWithLogging("identifyWeakTopics", identifyWeakTopicsNode))
  .addNode("determineDifficulty", wrapNodeWithLogging("determineDifficulty", determineDifficultyNode))
  .addNode("searchProblems", wrapNodeWithLogging("searchProblems", searchProblemsNode))
  .addNode("rankProblems", wrapNodeWithLogging("rankProblems", rankProblemsNode))
  .addNode("generateExplanation", wrapNodeWithLogging("generateExplanation", generateExplanationNode))
  .addNode("generateRoadmap", wrapNodeWithLogging("generateRoadmap", generateRoadmapNode));

export const problemRecommendationGraph =
  workflow
    .addEdge(START, "getProfile")
    .addEdge("getProfile", "getSubmissions")
    .addEdge("getSubmissions", "analyzeSubmissions")
    .addEdge("analyzeSubmissions", "analyzeMistakes")
    .addEdge("analyzeMistakes", "identifyWeakTopics")
    .addEdge("identifyWeakTopics", "determineDifficulty")
    .addEdge("determineDifficulty", "searchProblems")
    .addEdge("searchProblems", "rankProblems")
    .addEdge("rankProblems", "generateExplanation")
    .addEdge("generateExplanation", "generateRoadmap")
    .addEdge("generateRoadmap", END)
    .compile();