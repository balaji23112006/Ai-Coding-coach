/**
 * Guardrail Module
 * Checks AI responses to ensure they don't contain complete code solutions.
 * If a violation is detected, the response is rejected and a safe fallback is used.
 */

/**
 * Patterns that indicate a complete code solution is present in the response.
 * The guardrail blocks responses containing full function implementations.
 */
const SOLUTION_PATTERNS = [
  // Full function definitions
  /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{50,}\}/,
  /def\s+\w+\s*\([^)]*\)\s*:\s*\n[\s\S]{50,}/,
  // Class implementations
  /class\s+\w+.*\{[\s\S]{100,}\}/,
  // Large code blocks (3+ lines of code)
  /```[\s\S]{200,}```/,
  // Multiple return statements with logic
  /return\s+.+\n.+\n.*return\s+/,
];

/**
 * Phrases that signal the AI is giving away a complete solution
 */
const SOLUTION_PHRASES = [
  /here('s| is) the (complete|full|entire|working) (solution|code|implementation)/i,
  /here('s| is) how (you can|to) (solve|implement|fix) (it|this|the problem)/i,
  /complete working (solution|code)/i,
  /you can use this (code|solution)/i,
  /copy (and paste|this) (the following|this) (code|solution)/i,
];

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  sanitizedResponse?: string;
}

/**
 * Checks if a mentor response passes the guardrail.
 * Returns `{ passed: true }` if safe, or `{ passed: false, reason }` if rejected.
 */
export function checkGuardrail(response: string): GuardrailResult {
  // Check for solution-revealing phrases
  for (const phrase of SOLUTION_PHRASES) {
    if (phrase.test(response)) {
      return {
        passed: false,
        reason: 'Response contains solution-revealing language',
      };
    }
  }

  // Check for full code patterns (only if large code blocks exist)
  const codeBlockMatch = response.match(/```[\s\S]+?```/g);
  if (codeBlockMatch) {
    for (const block of codeBlockMatch) {
      for (const pattern of SOLUTION_PATTERNS) {
        if (pattern.test(block)) {
          return {
            passed: false,
            reason: 'Response contains a complete code implementation',
          };
        }
      }
    }
  }

  return { passed: true };
}

/**
 * Returns a safe fallback response when the guardrail is triggered.
 */
export function getFallbackResponse(category: string, level: number): string {
  const fallbacks: Record<string, string> = {
    syntax:
      'Take a close look at the structure of your code: check for missing colons, brackets, declarations, or indentation. What does the first compiler error say about the line that caused it?',
    logic:
      'Try tracing through your code manually with a simple example input. At what step does the actual output diverge from what you expect?',
    timeout:
      "Your solution might be doing more work than necessary. Can you think of a way to store intermediate results so you don't recompute them? What data structure could help here?",
    request:
      "Let's break the problem down step by step. What is the first thing your algorithm needs to figure out?",
  };

  const base = fallbacks[category] || fallbacks.request;

  if (level >= 3) {
    return `${base} Try sketching out the key steps in plain English before writing any code. What would the pseudocode look like?`;
  }

  return base;
}
