import { groqChat } from "../../../../providers/groq/index.js";
import { CandidateProblem } from "../types/recommendation-state.js";
import { MistakeAnalysis } from "../types/mistake-analysis.types.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export async function rankProblems(
  candidateProblems: CandidateProblem[],
  weakTopics: string[],
  mistakeAnalysis?: MistakeAnalysis,
  traceId?: string
): Promise<CandidateProblem[]> {
  if (!candidateProblems || candidateProblems.length === 0) {
    return [];
  }

  // If there's only 1 problem, no need to rank
  if (candidateProblems.length === 1) {
    return [{ ...candidateProblems[0], score: 100 }];
  }

  const primaryMistake = mistakeAnalysis?.primaryMistake || "None";
  const evidence = mistakeAnalysis?.evidence?.join("; ") || "None";
  const targetTopic = weakTopics.length > 0 ? weakTopics[0] : RECOMMENDATION_CONFIG.FALLBACK_TOPIC;

  const problemsContext = candidateProblems.map((p, idx) => `
ID: ${idx}
Title: ${p.title}
Difficulty: ${p.difficulty}
Topics: ${(p.topics || []).join(", ")}
Description snippet: ${p.description ? p.description.substring(0, 150) : ""}...
`).join("\n");

  const prompt = `
Student's Current Identified Flaw: ${primaryMistake}
Flaw Evidence: ${evidence}
Target Topic: ${targetTopic}

Below is a list of candidate problems.
Evaluate each problem on how well it helps the student address their specific logical flaws and weak topics.
Score each problem from 0 to 100 (100 being the perfect problem to solve their specific weakness).

${problemsContext}

Return ONLY a JSON array of objects in EXACTLY this format, sorted from highest score to lowest score:
[
  { "id": 0, "score": 95, "reason": "Short reason why" },
  { "id": 2, "score": 80, "reason": "Short reason why" }
]

DO NOT output markdown backticks like \`\`\`json. Output RAW JSON array only.`;

  try {
    const responseText = await groqChat({
      systemPrompt: "You are an expert AI Coding Coach. Rank the candidate problems based on how well they address the student's weaknesses. Output ONLY raw JSON array, nothing else.",
      userMessage: prompt,
      temperature: 0.1,
      maxTokens: 600,
    });
    
    // Clean up potential markdown formatting from LLM
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonText);

    if (Array.isArray(result) && result.length > 0 && typeof result[0].id === 'number') {
      // Re-map the original problems using the LLM's ranked indices
      const rankedProblems: CandidateProblem[] = [];
      for (const item of result) {
        if (candidateProblems[item.id]) {
          rankedProblems.push({
            ...candidateProblems[item.id],
            score: item.score
          });
        }
      }
      
      // Append any problems the LLM might have missed at the bottom
      for (let i = 0; i < candidateProblems.length; i++) {
        if (!rankedProblems.some(rp => rp.id === candidateProblems[i].id)) {
          rankedProblems.push({
            ...candidateProblems[i],
            score: 0
          });
        }
      }
      
      return rankedProblems;
    }
    
    throw new Error("LLM output did not match required JSON array structure");
  } catch (error) {
    console.error("[rankProblems] LLM Ranking failed, falling back to static heuristic scoring:", error);
    
    // Fallback static scoring
    const scores = RECOMMENDATION_CONFIG.SCORES;
    return candidateProblems
      .map((problem) => {
        let score = scores.TOPIC_MATCH; // Base score
        if (weakTopics.length > 0 && problem.topics?.includes(weakTopics[0])) {
          score += scores.WEAK_TOPIC_BONUS;
        }

        // Mistake-based boosting
        const topics = (problem.topics || []).map((t) => t.toLowerCase());

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
}
