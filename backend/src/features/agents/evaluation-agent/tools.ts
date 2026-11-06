import { codeExecutionService } from '../../assessments/execution/services/CodeExecutionService.js';
import { prisma } from '../../../database/prisma.js';
import { ExecResult, TestResults, BugReport, ComplexityResult, QualityResult } from './state.js';
import { mapStringToLanguage } from '../../assessments/execution/types/execution.types.js';

/**
 * Tool 1: executeCode(code: string, language: string): Promise<ExecResult>
 * Runs the code, returns stdout/stderr/exitCode
 */
export async function executeCode(code: string, language: string): Promise<ExecResult> {
  const result = await codeExecutionService.execute({
    language: language as any,
    sourceCode: code,
  });

  const exitCode = result.status === 'ACCEPTED' ? 0 : result.status === 'TIMEOUT' ? 124 : 1;

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode,
    success: result.success,
  };
}

/**
 * Tool 2: runTests(problemId, code, testCases, language): Promise<TestResults>
 * Runs each test case, returns pass/fail per test
 */
export async function runTests(
  problemId: string,
  code: string,
  testCases: Array<{ input: string; expectedOutput: string }>,
  language: string,
): Promise<TestResults> {
  const question = await prisma.question.findUnique({
    where: { id: problemId },
    include: { topics: { include: { topic: true } } },
  });

  const isTreeQuestion = question?.topics?.some((t: any) => t.topic.name === 'Trees') || false;
  const questionSlug = question?.slug || '';

  let finalDriver = '';

  if (language === 'javascript' || language === 'typescript') {
    const functionName =
      code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ??
      code.match(
        /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/,
      )?.[1] ??
      '';

    const jsTreeHelper = isTreeQuestion
      ? `
class TreeNode {
  constructor(val, left, right) {
    this.val = (val===undefined ? 0 : val);
    this.left = (left===undefined ? null : left);
    this.right = (right===undefined ? null : right);
  }
}

function deserializeTree(arr) {
  if (!arr || arr.length === 0) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (curr) {
      if (arr[i] !== null && arr[i] !== undefined) {
        curr.left = new TreeNode(arr[i]);
        queue.push(curr.left);
      }
      i++;
      if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
        curr.right = new TreeNode(arr[i]);
        queue.push(curr.right);
      }
      i++;
    }
  }
  return root;
}

function findNodesByVal(root, val, results = []) {
  if (!root) return results;
  if (root.val === val) results.push(root);
  findNodesByVal(root.left, val, results);
  findNodesByVal(root.right, val, results);
  return results;
}

function getLCA(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left = getLCA(root.left, p, q);
  const right = getLCA(root.right, p, q);
  if (left && right) return root;
  return left ? left : right;
}
`
      : '';

    finalDriver = `
${code}

${jsTreeHelper}

// --- TEST HARNESS DRIVER ---
const testCases = [
  ${testCases
    .map(
      (tc, idx) => `{
    index: ${idx},
    inputStr: ${JSON.stringify(tc.input)},
    input: [${tc.input}],
    expected: ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
];

function isNumeric(val) {
  return typeof val === 'number' && !isNaN(val);
}

function approxEqual(a, b, tolerance = 1e-6) {
  if (isNumeric(a) && isNumeric(b)) {
    return Math.abs(a - b) <= tolerance;
  }
  return false;
}

function normalizeVal(val) {
  if (typeof val === 'string') {
    return val.replace(/\\r\\n/g, '\\n').trim().replace(/[ \\t]+/g, ' ');
  }
  if (Array.isArray(val)) {
    return val.map(normalizeVal);
  }
  if (val && typeof val === 'object') {
    const res = {};
    for (const k of Object.keys(val)) {
      res[k] = normalizeVal(val[k]);
    }
    return res;
  }
  return val;
}

function compareOutputs(actual, expected) {
  if (isNumeric(actual) && isNumeric(expected)) {
    return approxEqual(actual, expected);
  }
  const normActual = normalizeVal(actual);
  const normExpected = normalizeVal(expected);
  
  if (isNumeric(normActual) && isNumeric(normExpected)) {
    return approxEqual(Number(normActual), Number(normExpected));
  }

  const isObjA = normActual && typeof normActual === 'object';
  const isObjB = normExpected && typeof normExpected === 'object';
  if (isObjA && isObjB) {
    const keysA = Object.keys(normActual);
    const keysB = Object.keys(normExpected);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!compareOutputs(normActual[key], normExpected[key])) return false;
    }
    return true;
  }
  
  return JSON.stringify(normActual) === JSON.stringify(normExpected);
}

const results = [];
for (const tc of testCases) {
  try {
    let args = tc.input;
    if (${isTreeQuestion}) {
      args = tc.input.map(arg => Array.isArray(arg) ? deserializeTree(arg) : arg);
    }
    if (${isTreeQuestion && questionSlug === 'lowest-common-ancestor-of-a-binary-tree'}) {
      const tree = args[0];
      const pCandidates = findNodesByVal(tree, tc.input[1]);
      const qCandidates = findNodesByVal(tree, tc.input[2]);
      let pNode = pCandidates[0] || null;
      let qNode = qCandidates[0] || null;
      let found = false;
      for (let pCand of pCandidates) {
        for (let qCand of qCandidates) {
          const lca = getLCA(tree, pCand, qCand);
          if (lca && lca.val === Number(tc.expected)) {
            pNode = pCand;
            qNode = qCand;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      args = [tree, pNode, qNode];
    }

    const actual = ${functionName ? `${functionName}(...args)` : 'undefined'};
    let finalActual = actual;
    if (actual && typeof actual === 'object' && 'val' in actual) {
      finalActual = actual.val;
    }
    const passed = compareOutputs(finalActual, tc.expected);
    results.push({
      testCase: tc.index,
      input: tc.inputStr,
      expected: JSON.stringify(tc.expected),
      actual: JSON.stringify(finalActual),
      passed: !!passed,
      error: null
    });
  } catch (e) {
    results.push({
      testCase: tc.index,
      input: tc.inputStr,
      expected: JSON.stringify(tc.expected),
      actual: null,
      passed: false,
      error: e.message || String(e)
    });
  }
}
console.log("===TEST_RESULTS_START===" + JSON.stringify(results) + "===TEST_RESULTS_END===");
`;
  } else if (language === 'python') {
    const functionName = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ?? '';

    const pyTreeHelper = isTreeQuestion
      ? `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def deserializeTree(arr):
    if not arr or len(arr) == 0:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        curr = queue.pop(0)
        if curr:
            if i < len(arr) and arr[i] is not None:
                curr.left = TreeNode(arr[i])
                queue.append(curr.left)
            i += 1
            if i < len(arr) and arr[i] is not None:
                curr.right = TreeNode(arr[i])
                queue.append(curr.right)
            i += 1
    return root

def findNodesByVal(root, val):
    if not root:
        return []
    res = []
    if root.val == val:
        res.append(root)
    res.extend(findNodesByVal(root.left, val))
    res.extend(findNodesByVal(root.right, val))
    return res

def getLCA(root, p, q):
    if not root or root == p or root == q:
        return root
    left = getLCA(root.left, p, q)
    right = getLCA(root.right, p, q)
    if left and right:
        return root
    return left if left else right
`
      : '';

    finalDriver = `
${code}

${pyTreeHelper}

# --- TEST HARNESS DRIVER ---
import json
null = None
false = False
true = True

test_cases = [
  ${testCases
    .map(
      (tc, idx) => `{
    "index": ${idx},
    "inputStr": ${JSON.stringify(tc.input)},
    "input": [${tc.input}],
    "expected": ${tc.expectedOutput}
  }`,
    )
    .join(',\n  ')}
]

def is_numeric(val):
    return isinstance(val, (int, float))

def approx_equal(a, b, tolerance=1e-6):
    if is_numeric(a) and is_numeric(b):
        return abs(a - b) <= tolerance
    return False

def normalize_val(val):
    if isinstance(val, str):
        return " ".join(val.replace("\\r\\n", "\\n").strip().split())
    if isinstance(val, list):
        return [normalize_val(x) for x in val]
    if isinstance(val, dict):
        return {k: normalize_val(v) for k, v in val.items()}
    return val

def compare_outputs(actual, expected):
    if is_numeric(actual) and is_numeric(expected):
        return approx_equal(actual, expected)
    norm_actual = normalize_val(actual)
    norm_expected = normalize_val(expected)
    
    try:
        if isinstance(norm_actual, str) and isinstance(norm_expected, str):
            return approx_equal(float(norm_actual), float(norm_expected))
    except ValueError:
        pass

    if isinstance(norm_actual, list) and isinstance(norm_expected, list):
        if len(norm_actual) != len(norm_expected):
            return False
        return all(compare_outputs(a, b) for a, b in zip(norm_actual, norm_expected))

    if isinstance(norm_actual, dict) and isinstance(norm_expected, dict):
        if len(norm_actual) != len(norm_expected):
            return False
        for k in norm_actual:
            if k not in norm_expected:
                return False
            if not compare_outputs(norm_actual[k], norm_expected[k]):
                return False
        return True

    return json.dumps(norm_actual, sort_keys=True) == json.dumps(norm_expected, sort_keys=True)

results = []
for tc in test_cases:
    try:
        args = [deserializeTree(arg) if isinstance(arg, list) else arg for arg in tc["input"]] if ${isTreeQuestion ? 'True' : 'False'} else tc["input"]
        if ${isTreeQuestion && questionSlug === 'lowest-common-ancestor-of-a-binary-tree' ? 'True' : 'False'}:
            tree = args[0]
            p_val = tc["input"][1]
            q_val = tc["input"][2]
            expected_val = int(tc["expected"])
            p_candidates = findNodesByVal(tree, p_val)
            q_candidates = findNodesByVal(tree, q_val)
            p_node = p_candidates[0] if p_candidates else None
            q_node = q_candidates[0] if q_candidates else None
            found = False
            for p_cand in p_candidates:
                for q_cand in q_candidates:
                    lca_node = getLCA(tree, p_cand, q_cand)
                    if lca_node and lca_node.val == expected_val:
                        p_node = p_cand
                        q_node = q_cand
                        found = True
                        break
                if found:
                    break
            args = [tree, p_node, q_node]

        # Invoke the solution
        sol_instance = Solution() if 'Solution' in globals() else None
        if sol_instance and hasattr(sol_instance, '${functionName}'):
            actual = sol_instance.${functionName}(*args)
        else:
            actual = ${functionName}(*args)

        final_actual = actual
        if actual and hasattr(actual, 'val'):
            final_actual = actual.val

        passed = compare_outputs(final_actual, tc["expected"])
        results.append({
            "testCase": tc["index"],
            "input": tc["inputStr"],
            "expected": json.dumps(tc["expected"]),
            "actual": json.dumps(final_actual),
            "passed": bool(passed),
            "error": None
        })
    except Exception as e:
        results.append({
            "testCase": tc["index"],
            "input": tc["inputStr"],
            "expected": json.dumps(tc["expected"]),
            "actual": None,
            "passed": False,
            "error": str(e)
        })

print("===TEST_RESULTS_START===" + json.dumps(results) + "===TEST_RESULTS_END===")
`;
  } else {
    // Unsupported fallback driver
    finalDriver = code;
  }

  const result = await codeExecutionService.execute({
    language: language as any,
    sourceCode: finalDriver,
  });

  const parsedResults: any[] = [];
  let allPassed = false;
  let passed = 0;
  let failed = 0;

  if (result.stdout) {
    const startMarker = '===TEST_RESULTS_START===';
    const endMarker = '===TEST_RESULTS_END===';
    const startIdx = result.stdout.indexOf(startMarker);
    const endIdx = result.stdout.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = result.stdout.substring(startIdx + startMarker.length, endIdx);
      try {
        const list = JSON.parse(jsonStr);
        parsedResults.push(...list);
      } catch (err) {
        // parsing failed
      }
    }
  }

  // Fallback if marker not found or empty
  if (parsedResults.length === 0) {
    testCases.forEach((tc, idx) => {
      parsedResults.push({
        testCase: idx,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: 'No output due to compilation or execution failure.',
        passed: false,
        error: result.stderr || 'Execution failed',
      });
    });
  }

  passed = parsedResults.filter((r) => r.passed).length;
  failed = parsedResults.length - passed;
  allPassed = failed === 0;
  const passRate = parsedResults.length > 0 ? (passed / parsedResults.length) * 100 : 0;

  return {
    passed,
    failed,
    total: parsedResults.length,
    passRate,
    allPassed,
    results: parsedResults,
  };
}

/**
 * Tool 3: detectErrors(code, stderr, failedTests): BugReport
 */
export function detectErrors(code: string, stderr: string, failedTests: any[]): BugReport {
  const bugs: BugReport['bugs'] = [];

  // 1. Check stderr for runtime/syntax errors
  if (stderr && stderr.trim().length > 0) {
    let line: number | undefined;
    let message = stderr.trim();

    // Parse JS/Node stack line: e.g. "at Object.<anonymous> (/path/to/file.js:10:9)"
    const jsLineMatch = stderr.match(/:(\d+):\d+\b/);
    if (jsLineMatch) {
      line = parseInt(jsLineMatch[1], 10);
    }

    // Parse Python line: e.g. "File \"main.py\", line 5, in <module>"
    const pyLineMatch = stderr.match(/line (\d+)/i);
    if (pyLineMatch) {
      line = parseInt(pyLineMatch[1], 10);
    }

    // Extract cleaner error message (first or last few lines)
    const lines = stderr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      if (lastLine.includes('Error:') || lastLine.includes('Exception:')) {
        message = lastLine;
      } else {
        const firstLine = lines[0];
        message = firstLine;
      }
    }

    bugs.push({
      type: 'runtime_error',
      message,
      line,
      hint: getRuntimeErrorHint(message),
    });
  }

  // 2. Check failed tests for logic errors
  if (failedTests && failedTests.length > 0) {
    const sample = failedTests[0];
    bugs.push({
      type: 'logic_error',
      message: `Failed test case: input '${sample.input}' expected '${sample.expected}', but got '${sample.actual}'.`,
      hint: 'Your algorithm runs without crashing but produces the wrong output. Dry-run your logic with a small input and check for edge cases like boundaries, off-by-one errors, or empty inputs.',
    });
  }

  // 3. Static analysis checks
  // Python bare except
  if (/except\s*:/i.test(code)) {
    bugs.push({
      type: 'static_warning',
      message: 'Bare except clause detected',
      hint: "Avoid using bare 'except:'. It catches all exceptions, including system-exiting signals like KeyboardInterrupt. Use 'except Exception:' instead.",
    });
  }

  // Global variables check
  if (/\bglobal\s+[a-zA-Z_]/i.test(code) || /\bwindow\.[a-zA-Z_]/i.test(code)) {
    bugs.push({
      type: 'static_warning',
      message: 'Global state usage detected',
      hint: 'Avoid using global variables or properties. They introduce side effects and make code testing and concurrency difficult. Pass parameters inside functions instead.',
    });
  }

  // Var keyword check
  if (/\bvar\s+[a-zA-Z_]/i.test(code)) {
    bugs.push({
      type: 'static_warning',
      message: 'Usage of older var declarations',
      hint: "Use 'let' or 'const' instead of 'var' to enforce proper block scoping and prevent hoisting bugs.",
    });
  }

  // Eval check
  if (/\beval\(/i.test(code)) {
    bugs.push({
      type: 'static_warning',
      message: 'Dangerous eval() statement found',
      hint: "Avoid 'eval()' as it executes arbitrary strings, which pose severe security and performance optimization risks.",
    });
  }

  return {
    hasBugs: bugs.length > 0,
    bugCount: bugs.length,
    bugs,
  };
}

function getRuntimeErrorHint(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('stack overflow') || msg.includes('maximum call stack size exceeded')) {
    return 'Stack Overflow: This typically indicates infinite recursion. Check your base cases and recursive bounds.';
  }
  if (msg.includes('division by zero') || msg.includes('/ zero')) {
    return 'Division by Zero: Check if you are dividing by a variable that resolves to 0.';
  }
  if (msg.includes('indexerror') || msg.includes('out of bounds') || msg.includes('undefined')) {
    return 'Array Index Out of Bounds: You are attempting to read or write to an array element index that does not exist. Verify your loop limits.';
  }
  if (
    msg.includes('nullpointer') ||
    msg.includes('cannot read properties of null') ||
    msg.includes("noneType' object has no attribute")
  ) {
    return 'Null Reference: You are trying to dereference a null/None object. Check tree node children or search lookups.';
  }
  if (msg.includes('syntaxerror') || msg.includes('unexpected token')) {
    return 'Syntax Error: Check for missing brackets, semi-colons, or keyword typos.';
  }
  return 'Runtime Error: Review the stack trace above to pinpoint where the variable initialization or operation failed.';
}

/**
 * Tool 4: analyzeComplexity(code, problemId?): ComplexityResult
 */
export async function analyzeComplexity(
  code: string,
  problemId?: string,
): Promise<ComplexityResult> {
  let timeComplexity = 'O(n)';
  let spaceComplexity = 'O(1)';
  let suggestion: string | null = null;
  let isOptimal = true;

  // 1. Detect structures
  const hasRecursion = checkRecursion(code);
  const hasMapSet = /(new\s+Map|new\s+Set|\bdict\(\)|\bset\(\)|defaultdict|Counter)/i.test(code);
  const hasSort = /(\.sort\(|sorted\()/i.test(code);
  const hasBinarySearch = /(mid\s*=|low\s*<=\s*high|left\s*<=\s*right|>>\s*1)/i.test(code);

  // 2. Count nested loop depth
  const loopDepth = getLoopDepth(code);

  // 3. Estimate complexities
  if (hasBinarySearch) {
    timeComplexity = 'O(log n)';
    spaceComplexity = hasRecursion ? 'O(log n)' : 'O(1)';
  } else if (loopDepth === 0) {
    timeComplexity = hasRecursion ? 'O(2^n)' : 'O(1)';
    spaceComplexity = hasRecursion ? 'O(n)' : 'O(1)';
  } else if (loopDepth === 1) {
    timeComplexity = hasSort ? 'O(n log n)' : 'O(n)';
    spaceComplexity = hasMapSet ? 'O(n)' : 'O(1)';
  } else if (loopDepth === 2) {
    timeComplexity = 'O(n²)';
    spaceComplexity = hasMapSet ? 'O(n)' : 'O(1)';
  } else {
    timeComplexity = `O(n^${loopDepth})`;
    spaceComplexity = hasMapSet ? 'O(n)' : 'O(1)';
  }

  // 4. Look up optimal complexities
  if (problemId) {
    const question = await prisma.question.findUnique({
      where: { id: problemId },
      select: { slug: true, difficulty: true },
    });

    if (question) {
      const slug = question.slug;
      let optTime = 'O(n)';
      let optSpace = 'O(1)';

      if (slug === 'two-sum') {
        optTime = 'O(n)';
        optSpace = 'O(n)';
      } else if (slug === 'binary-search') {
        optTime = 'O(log n)';
        optSpace = 'O(1)';
      } else if (slug === 'merge-sort') {
        optTime = 'O(n log n)';
        optSpace = 'O(n)';
      } else if (slug === 'reverse-linked-list') {
        optTime = 'O(n)';
        optSpace = 'O(1)';
      } else if (question.difficulty === 'Easy') {
        optTime = 'O(n)';
        optSpace = 'O(1)';
      } else {
        optTime = 'O(n)';
        optSpace = 'O(n)';
      }

      // Check if optimal
      const timeRanks: Record<string, number> = {
        'O(1)': 0,
        'O(log n)': 1,
        'O(n)': 2,
        'O(n log n)': 3,
        'O(n²)': 4,
        'O(n³)': 5,
        'O(2^n)': 6,
      };

      const estimatedRank = timeRanks[timeComplexity] ?? 5;
      const optimalRank = timeRanks[optTime] ?? 2;

      if (estimatedRank > optimalRank) {
        isOptimal = false;
        suggestion = `Your solution runs in ${timeComplexity} time, which is sub-optimal. You can optimize this problem to ${optTime} time and ${optSpace} space. Try using ${optSpace === 'O(n)' ? 'a hash map/set to track elements' : 'a two-pointer approach'} to eliminate the nested loops.`;
      }
    }
  }

  return {
    timeComplexity,
    spaceComplexity,
    isOptimal,
    suggestion,
  };
}

function getLoopDepth(code: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  const lines = code.split('\n');

  // Simple Indentation-based check for Python
  const isPython = /def\s+[a-zA-Z_]/i.test(code);
  if (isPython) {
    const loopIndents: number[] = [];
    for (const line of lines) {
      const match = line.match(/^(\s*)(for\b|while\b)/i);
      const indent = match ? match[1].length : -1;
      const cleanLine = line.trim();

      if (indent !== -1) {
        // Pop any indents that are outer
        while (loopIndents.length > 0 && loopIndents[loopIndents.length - 1] >= indent) {
          loopIndents.pop();
        }
        loopIndents.push(indent);
        maxDepth = Math.max(maxDepth, loopIndents.length);
      }
    }
    return maxDepth;
  }

  // Braces-based check for JS/TS
  for (const line of lines) {
    if (/(for\b|while\b|\.forEach\b|\.map\b)/i.test(line)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    // Very simple bracket counting helper
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    if (closeBraces > openBraces && currentDepth > 0) {
      currentDepth = Math.max(0, currentDepth - (closeBraces - openBraces));
    }
  }

  return maxDepth;
}

function checkRecursion(code: string): boolean {
  // Extract function name
  const functionName =
    code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ??
    code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/)?.[1] ??
    '';
  if (!functionName) return false;

  const lines = code.split('\n');
  let firstDeclarationFound = false;
  for (const line of lines) {
    if (line.includes('function ' + functionName) || line.includes('def ' + functionName)) {
      if (!firstDeclarationFound) {
        firstDeclarationFound = true;
        continue;
      }
    }
    if (line.includes(functionName + '(')) {
      return true;
    }
  }
  return false;
}

/**
 * Tool 5: reviewCode(code): QualityResult
 */
export function reviewCode(code: string): QualityResult {
  let score = 100;
  const issues: string[] = [];
  const feedback: string[] = [];

  const hasComments = /(\/\/|#|\/\*|\*\/)/.test(code);
  if (!hasComments) {
    score -= 10;
    issues.push('Missing comments or docstrings.');
    feedback.push('Adding comments makes your code more readable and maintainable.');
  } else {
    feedback.push('Good job commenting your code.');
  }

  const hasFunction = /(function\b|def\b|class\b)/.test(code);
  if (!hasFunction) {
    score -= 15;
    issues.push('Missing clear function, method, or class definition.');
    feedback.push('Structure your code inside functions/methods for better reusability.');
  }

  const singleLetterVar = /\b(const|let|var)\s+([a-hj-lmn-z])\b|\b([a-hj-lmn-z])\s*=[^=]/i.test(
    code,
  );
  if (singleLetterVar) {
    score -= 10;
    issues.push(
      'Use of single-letter variable names (other than common loop counters like i, j, k).',
    );
    feedback.push('Use descriptive names for variables to convey their purpose clearly.');
  }

  const lines = code.split('\n');
  const hasLongLines = lines.some((line) => line.length > 80);
  if (hasLongLines) {
    score -= 5;
    issues.push('Some lines of code exceed 80 characters.');
    feedback.push(
      'Keep lines under 80 characters to comply with standard style guides and prevent horizontal scrolling.',
    );
  }

  const hasTabs = lines.some((line) => line.includes('\t'));
  const hasSpaces = lines.some((line) => /^\s+/.test(line) && !line.includes('\t'));
  if (hasTabs && hasSpaces) {
    score -= 10;
    issues.push('Mixed tabs and spaces for indentation.');
    feedback.push(
      'Consistently use either tabs or spaces (spaces are preferred) to prevent indentation errors, especially in Python.',
    );
  }

  score = Math.max(0, Math.min(100, score));

  let grade: QualityResult['grade'];
  if (score >= 90) {
    grade = 'Excellent';
  } else if (score >= 75) {
    grade = 'Good';
  } else if (score >= 50) {
    grade = 'Needs Improvement';
  } else {
    grade = 'Poor';
  }

  return {
    qualityScore: score,
    grade,
    issues,
    feedback,
  };
}

/**
 * Tool 6: saveEvalResult(report): Promise<any>
 */
export async function saveEvalResult(report: any): Promise<any> {
  const savedAt = new Date().toISOString();

  let userConnect = undefined;
  if (report.userId) {
    const userExists = await prisma.user.findUnique({
      where: { id: report.userId },
    });
    if (userExists) {
      userConnect = { connect: { id: report.userId } };
    }
  }

  const submission = await prisma.submission.create({
    data: {
      language: mapStringToLanguage(report.language),
      status: report.verdict === 'Pass' ? 'ACCEPTED' : 'FAILED',
      sourceCode: report.submittedCode,
      stdout: JSON.stringify({
        evalScore: report.evalScore,
        verdict: report.verdict,
        feedback: report.feedback,
        complexity: report.complexity,
        qualityReview: report.qualityReview,
        bugReport: report.bugReport,
        savedAt,
      }),
      stderr: report.execResult?.stderr || '',
      executionTime: report.execResult?.executionTime || 0,
      memoryUsed: report.execResult?.memoryUsed || 0,
      testsPassed: report.testResults?.passed || 0,
      testsTotal: report.testResults?.total || 0,
      user: userConnect,
      question: report.problemId ? { connect: { id: report.problemId } } : undefined,
    },
  });

  return {
    ...submission,
    savedAt,
  };
}
