import { MistakeAnalysis } from "../types/mistake-analysis.types.js";
import { ExtendedSubmission } from "../types/recommendation-state.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

const RECURSION_KEYWORDS = ["maximum call stack size exceeded", "stack overflow", "recursionerror", "too much recursion"];
const NULL_UNDEFINED_KEYWORDS = ["cannot read properties of undefined", "cannot read property", "is not a function", "typeerror: cannot read", "nonetype has no attribute", "null pointer"];
const TREE_KEYWORDS = ["'left'", "'right'", "'val'", "reading 'left'", "reading 'right'", "reading 'val'"];
const ARRAY_KEYWORDS = ["indexerror", "out of bounds", "out of range", "index out of range"];

export function analyzeMistakePatterns(
  submissions: ExtendedSubmission[]
): MistakeAnalysis {
  const failedSubmissions = (submissions ?? []).filter(
    (s) => s.status !== "ACCEPTED"
  );

  if (failedSubmissions.length === 0) {
    return {
      primaryMistake: "None",
      confidence: 0,
      evidence: [],
    };
  }

  // Define counts and evidence arrays for each pattern
  const patterns = {
    recursion: {
      name: "Recursion Handling",
      score: 0,
      evidence: [] as string[],
    },
    stackOverflow: {
      name: "Stack Overflow",
      score: 0,
      evidence: [] as string[],
    },
    nullUndefined: {
      name: "Null/Undefined Handling",
      score: 0,
      evidence: [] as string[],
    },
    treeTraversal: {
      name: "Tree Traversal",
      score: 0,
      evidence: [] as string[],
    },
    arrayIndexing: {
      name: "Array Indexing",
      score: 0,
      evidence: [] as string[],
    },
    timeLimit: {
      name: "Time Limit Exceeded",
      score: 0,
      evidence: [] as string[],
    },
    compileError: {
      name: "Compile Error",
      score: 0,
      evidence: [] as string[],
    },
    runtimeError: {
      name: "Runtime Error",
      score: 0,
      evidence: [] as string[],
    },
    wrongAnswer: {
      name: "Wrong Answer",
      score: 0,
      evidence: [] as string[],
    },
    edgeCase: {
      name: "Edge Case Failures",
      score: 0,
      evidence: [] as string[],
    },
  };

  // Analyze failed submissions
  for (const sub of failedSubmissions) {
    const errorText = `${sub.stderr ?? ""} ${sub.stdout ?? ""}`.toLowerCase();
    
    // 1. Recursion / Stack Overflow
    const matchesRecursion = RECURSION_KEYWORDS.some((k) => errorText.includes(k));
    
    // Topics checking
    const questionTopics = sub.question?.topics?.map((qt: any) => qt.topic?.name?.toLowerCase() || "") || [];
    const isTreeOrRecursion = questionTopics.some((t: string) => t.includes("tree") || t.includes("recursion") || t.includes("dfs") || t.includes("backtracking"));

    if (matchesRecursion) {
      patterns.stackOverflow.score += 2.0;
      patterns.stackOverflow.evidence.push("Maximum call stack size exceeded error detected.");
      patterns.recursion.score += 1.5;
      patterns.recursion.evidence.push("Recursive stack overflow error detected.");
    } else if (sub.status === "TIMEOUT" && isTreeOrRecursion) {
      patterns.recursion.score += 1.0;
      patterns.recursion.evidence.push("Timeout detected on a recursive/tree problem, likely infinite recursion.");
    }

    // 2. Null/Undefined handling
    const matchesNullUndefined = NULL_UNDEFINED_KEYWORDS.some((k) => errorText.includes(k));
    if (matchesNullUndefined) {
      patterns.nullUndefined.score += 1.8;
      patterns.nullUndefined.evidence.push(`Null/undefined type error: "${sub.stderr?.substring(0, 80)}..."`);
    }

    // 3. Tree Traversal
    const matchesTreeErrors = TREE_KEYWORDS.some((k) => errorText.includes(k)) && questionTopics.some((t: string) => t.includes("tree"));
    if (matchesTreeErrors) {
      patterns.treeTraversal.score += 2.0;
      patterns.treeTraversal.evidence.push("Tree node attribute access error (val/left/right) on null or undefined.");
    } else if (questionTopics.some((t: string) => t.includes("tree"))) {
      patterns.treeTraversal.score += 0.8;
      patterns.treeTraversal.evidence.push(`Failed attempt on Trees question: "${sub.question?.title}"`);
    }

    // 4. Array Indexing
    const matchesArrayErrors = ARRAY_KEYWORDS.some((k) => errorText.includes(k));
    const isArrayTopic = questionTopics.some((t: string) => t.includes("array") || t.includes("list") || t.includes("string") || t.includes("two pointers") || t.includes("sliding window") || t.includes("matrix"));
    
    if (matchesArrayErrors) {
      patterns.arrayIndexing.score += 2.0;
      patterns.arrayIndexing.evidence.push("Array or collection indexing out of bounds exception.");
    } else if (isArrayTopic && (errorText.includes("undefined") || errorText.includes("nan"))) {
      patterns.arrayIndexing.score += 1.2;
      patterns.arrayIndexing.evidence.push("Accessing undefined index values during array/string traversal.");
    } else if (isArrayTopic) {
      patterns.arrayIndexing.score += 0.6;
      patterns.arrayIndexing.evidence.push(`Failed attempt on Array/String indexing problem: "${sub.question?.title}"`);
    }

    // 5. Time Limit Exceeded
    if (sub.status === "TIMEOUT" || (sub.executionTime && sub.executionTime >= RECOMMENDATION_CONFIG.TIMEOUT_THRESHOLD_MS)) {
      patterns.timeLimit.score += 1.5;
      patterns.timeLimit.evidence.push(`Timeout exceeded ${RECOMMENDATION_CONFIG.TIMEOUT_THRESHOLD_MS / 1000}.0 seconds on "${sub.question?.title}".`);
    }

    // 6. Compile Error
    if (sub.status === "COMPILATION_ERROR") {
      patterns.compileError.score += 1.5;
      patterns.compileError.evidence.push(`Syntax or compilation failure: ${sub.stderr?.substring(0, 100)}`);
    }

    // 7. Runtime Error
    if (sub.status === "RUNTIME_ERROR" && !matchesNullUndefined && !matchesRecursion && !matchesArrayErrors) {
      patterns.runtimeError.score += 1.0;
      patterns.runtimeError.evidence.push(`Uncaught runtime exception: ${sub.stderr?.substring(0, 100)}`);
    }

    // 8. Wrong Answer & 9. Edge Case Failures
    if (sub.status === "FAILED") {
      const passed = sub.testsPassed ?? 0;
      const total = sub.testsTotal ?? 0;

      if (passed > 0 && total > 0 && passed < total) {
        patterns.edgeCase.score += 1.5;
        patterns.edgeCase.evidence.push(`Failed edge cases: Passed ${passed}/${total} test cases on "${sub.question?.title}".`);
      } else {
        patterns.wrongAnswer.score += 1.0;
        patterns.wrongAnswer.evidence.push(`Wrong Answer (passed 0 test cases) on "${sub.question?.title}".`);
      }
    }
  }

  // 10. Frequent failed attempts detection (consecutive check)
  let consecutiveFailed = 0;
  for (const sub of submissions) {
    if (sub.status !== "ACCEPTED") {
      consecutiveFailed++;
    } else {
      break;
    }
  }
  if (consecutiveFailed >= 3) {
    patterns.wrongAnswer.score += consecutiveFailed * 0.3;
    patterns.wrongAnswer.evidence.push(`High frequency of recent failed attempts (${consecutiveFailed} consecutive failures).`);
  }

  // Identify the mistake pattern with the highest score
  let primaryKey: keyof typeof patterns = "wrongAnswer";
  let maxScore = -1;

  for (const key of Object.keys(patterns) as Array<keyof typeof patterns>) {
    if (patterns[key].score > maxScore && patterns[key].evidence.length > 0) {
      maxScore = patterns[key].score;
      primaryKey = key;
    }
  }

  // If no patterns found or scores are all 0
  if (maxScore <= 0 || patterns[primaryKey].evidence.length === 0) {
    return {
      primaryMistake: "None",
      confidence: 0,
      evidence: [],
    };
  }

  // Calculate confidence score (bounded between 0.1 and 0.99)
  const baseConfidence = Math.min(0.99, 0.4 + maxScore * 0.15);

  return {
    primaryMistake: patterns[primaryKey].name,
    confidence: parseFloat(baseConfidence.toFixed(2)),
    evidence: [...new Set(patterns[primaryKey].evidence)].slice(0, 3),
  };
}
