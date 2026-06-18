/**
 * Hint Escalation Module
 * Determines how detailed the next hint should be based on
 * the number of hints already given and the error category.
 *
 * Level 1 – Concept Explanation (general educational guidance)
 * Level 2 – Location / Clue (points to the problem area)
 * Level 3 – Pseudocode / Dry Run (higher-level walkthrough)
 * Level 4 – Guardrail (never give complete solutions)
 */

import { HintLevel, HintRecord } from './types.js';

/**
 * Determines the appropriate hint level based on hint history.
 *
 * Logic:
 * - 0 previous hints → Level 1
 * - 1 previous hint  → Level 2
 * - 2 previous hints → Level 3
 * - 3+ hints         → Level 3 max (guardrail prevents Level 4 from revealing solutions)
 */
export function determineHintLevel(hintHistory: HintRecord[]): HintLevel {
  const count = hintHistory.length;

  if (count === 0) return 1;
  if (count === 1) return 2;
  if (count === 2) return 3;
  if (count === 3) return 4;
  return 5;
}

/**
 * Returns a human-readable description of the hint level for system prompts.
 */
export function getHintLevelDescription(level: HintLevel): string {
  switch (level) {
    case 1:
      return `
HINT LEVEL 1 – CONCEPT EXPLANATION:
- Give a general educational explanation of the relevant concept.
- Do NOT reference the student's specific code yet.
- Focus on the principle, not the solution.
- End with a question that prompts reflection.
Example style: "A hash map lets you look up values in O(1) time using keys. Have you considered what data structure would let you find a complement in one pass?"`;

    case 2:
      return `
HINT LEVEL 2 – LOCATION / CLUE:
- Reference the student's specific code, but only point to WHERE the issue is.
- Do NOT show how to fix it.
- Ask a Socratic question about the problematic section.
Example style: "Look closely at line X where you compare arr[i] with arr[i+1]. Does this always check every possible pair?"`;

    case 3:
      return `
HINT LEVEL 3 – ALGORITHMIC DIRECTION:
- Explain the algorithmic direction or step-by-step logic required.
- Do NOT write pseudocode or code syntax.
- Focus on the logic transition or state change.
- End with a question.
Example style: "We want to check if a complement exists. If we store elements in a set as we iterate, we can check for the complement of the current element in O(1) time. How would you structure this check inside your loop?"`;

    case 4:
      return `
HINT LEVEL 4 – PSEUDOCODE:
- You may provide high-level pseudocode or a step-by-step dry run example.
- Show the APPROACH, not the actual code syntax.
- Do NOT write a working code solution.
- Use comments or English-like pseudocode only.
Example style: "Try thinking through it like this:\n  for each element:\n    check if complement exists in seen set\n  This avoids the nested loop. Can you implement this idea?"`;

    case 5:
      return `
HINT LEVEL 5 – COMMON MISTAKES AND EDGE CASES:
- Highlight typical pitfalls (e.g. integer overflows, empty inputs, single element lists, floating-point precision, off-by-one errors) relative to this topic.
- Help the student identify if their current code is missing an edge case.
- Do NOT write a working code solution.`;

    default:
      return '';
  }
}
