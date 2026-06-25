import { CandidateProblem } from "../types/recommendation-state.js";
import { MistakeAnalysis } from "../types/mistake-analysis.types.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export function rankProblems(
  candidateProblems: CandidateProblem[],
  weakTopics: string[],
  mistakeAnalysis?: MistakeAnalysis
): CandidateProblem[] {
  const primaryMistake = mistakeAnalysis?.primaryMistake || "None";
  const scores = RECOMMENDATION_CONFIG.SCORES;

  return candidateProblems
    .map((problem) => {
      let score = scores.TOPIC_MATCH; // Base score

      // Weak topic match
      if (
        weakTopics.length > 0 &&
        problem.topics?.includes(weakTopics[0])
      ) {
        score += scores.WEAK_TOPIC_BONUS;
      }

      // Mistake-based boosting
      const topics = (problem.topics || []).map((t: string) => t.toLowerCase());

      if (primaryMistake === "Recursion Handling" || primaryMistake === "Stack Overflow") {
        if (topics.some((t: string) => t.includes("recursion") || t.includes("dfs") || t.includes("tree") || t.includes("backtracking"))) {
          score += scores.MEDIUM_PROBLEM; // Reuse config score
        }
      } else if (primaryMistake === "Array Indexing") {
        if (topics.some((t: string) => t.includes("array") || t.includes("string") || t.includes("index") || t.includes("two pointers") || t.includes("sliding window"))) {
          score += scores.MEDIUM_PROBLEM;
        }
      } else if (primaryMistake === "Tree Traversal") {
        if (topics.some((t: string) => t.includes("tree") || t.includes("dfs") || t.includes("bfs"))) {
          score += scores.MEDIUM_PROBLEM;
        }
      } else if (
        primaryMistake === "Null/Undefined Handling" || 
        primaryMistake === "Edge Case Failures" ||
        primaryMistake === "Compile Error" ||
        primaryMistake === "Runtime Error" ||
        primaryMistake === "Wrong Answer"
      ) {
        // Boost Easy questions and basic structure questions for fundamental mistakes
        if (problem.difficulty === "Easy") {
          score += scores.EASY_PROBLEM;
        } else {
          score += scores.HARD_PROBLEM;
        }
      } else if (primaryMistake === "Time Limit Exceeded") {
        // Boost problems that have efficient solution patterns or simpler structures
        if (problem.difficulty === "Easy" || problem.difficulty === "Medium") {
          score += scores.TOPIC_MATCH;
        }
      }

      return {
        ...problem,
        score,
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}