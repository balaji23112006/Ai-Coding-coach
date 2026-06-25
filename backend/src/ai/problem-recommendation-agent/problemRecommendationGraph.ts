import { START, END, StateGraph } from "@langchain/langgraph";

import { ProblemRecommendationState } from "./state.js";

import { getProfileNode } from "./nodes/getProfile.node.js";
import { getSubmissionsNode } from "./nodes/getSubmissions.node.js";
import { analyzeSubmissionsNode } from "./nodes/analyzeSubmissions.node.js";
import { analyzeMistakesNode } from "./nodes/analyzeMistakes.node.js";
import { identifyWeakTopicsNode } from "./nodes/identifyWeakTopics.node.js";
import { determineDifficultyNode } from "./nodes/determineDifficulty.node.js";
import { searchProblemsNode } from "./nodes/searchProblems.node.js";
import { rankProblemsNode } from "./nodes/rankProblems.node.js";
import { generateExplanationNode } from "./nodes/generateExplanation.node.js";

export const workflow = new StateGraph(
  ProblemRecommendationState
)
  .addNode("getProfile", getProfileNode)
  .addNode("getSubmissions", getSubmissionsNode)
  .addNode("analyzeSubmissions", analyzeSubmissionsNode)
  .addNode("analyzeMistakes", analyzeMistakesNode)
  .addNode("identifyWeakTopics", identifyWeakTopicsNode)
  .addNode("determineDifficulty", determineDifficultyNode)
  .addNode("searchProblems", searchProblemsNode)
  .addNode("rankProblems", rankProblemsNode)
  .addNode("generateExplanation", generateExplanationNode);
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
    .addEdge("generateExplanation", END)
    .compile();