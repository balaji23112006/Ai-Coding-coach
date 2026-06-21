/**
 * Mentor Agent Prompt Templates
 * Builds system prompts for each error category with Socratic questioning rules.
 */

import { ErrorCategory, HintLevel, HintRecord } from './types.js';
import { getHintLevelDescription } from './escalation.js';

export interface PromptContext {
  category: ErrorCategory;
  level: HintLevel;
  targetedConcept: string;
  questionTitle?: string;
  questionDescription?: string;
  sourceCode?: string;
  executionOutput?: string;
  previousHints: HintRecord[];
  userQuestion?: string;
}

/**
 * Conceptual analogies for common CS concepts.
 * Used to enrich Level 1 hints.
 */
const CONCEPT_ANALOGIES: Record<string, string> = {
  Stack:
    'like a stack of cafeteria plates — the last plate added is the first one you take off (LIFO).',
  Queue:
    'like people waiting in line — the first person to arrive is the first to be served (FIFO).',
  'Hash Map':
    "like a phone book — you can instantly look up a person's number by their name, without scanning every entry.",
  Recursion:
    'like Russian nesting dolls — each function call opens a smaller version of the same problem until you hit the base case.',
  'Dynamic Programming':
    'like keeping a notebook of answers — instead of re-solving sub-problems, you look up what you already computed.',
  'Binary Search':
    'like finding a word in a dictionary — you open to the middle, decide which half to search, and repeat.',
  'Two Pointer':
    'like two people walking toward each other from opposite ends of a row — they meet in the middle and reduce the search space.',
  'Sliding Window':
    'like a camera lens panning across a row of elements — it keeps a fixed view and moves one step at a time.',
};

function getConceptAnalogy(concept: string): string | null {
  for (const [key, analogy] of Object.entries(CONCEPT_ANALOGIES)) {
    if (concept.toLowerCase().includes(key.toLowerCase())) {
      return `Think of ${key} ${analogy}`;
    }
  }
  return null;
}

/**
 * Category-specific guidance instructions injected into the system prompt.
 */
function getCategoryGuidance(category: ErrorCategory): string {
  switch (category) {
    case 'syntax':
      return `
CATEGORY: SYNTAX / COMPILATION ERROR
- Explain what the syntax error means in simple terms.
- Point to the type of mistake without rewriting their code.
- Help the student understand the language rule being violated.
- Do NOT fix the code for them.`;

    case 'logic':
      return `
CATEGORY: LOGIC / FAILED TESTS
- Compare expected vs actual behavior conceptually.
- Identify which step in their reasoning is flawed.
- Encourage them to trace through the code manually.
- Ask a specific Socratic question about the problematic logic.`;

    case 'timeout':
      return `
CATEGORY: TIME LIMIT EXCEEDED (TLE)
- Do NOT give the optimized algorithm directly.
- Explain the concept of time complexity simply.
- Ask the student to think about what their current approach does for large inputs.
- Suggest they think about data structures that could eliminate repeated work.`;

    case 'request':
      return `
CATEGORY: GENERAL HINT REQUEST
- Understand what the student is asking.
- Give conceptual guidance relevant to the problem.
- Ask a guiding question to help them make the next step themselves.`;
  }
}

/**
 * Builds the complete system prompt for the Mentor Agent LLM call.
 */
export function buildMentorSystemPrompt(ctx: PromptContext): string {
  const analogy = getConceptAnalogy(ctx.targetedConcept);
  const prevHintSummary =
    ctx.previousHints.length > 0
      ? `\nPREVIOUS HINTS ALREADY GIVEN:\n${ctx.previousHints.map((h, i) => `  ${i + 1}. [Level ${h.level}] ${h.feedback.slice(0, 120)}...`).join('\n')}`
      : '\nNo previous hints have been given yet.';

  return `
You are the Mentor Agent for the AI-Powered Coding Practice Coach (Skill Lens).
Your role is an experienced, Socratic coding tutor. You guide students to solutions through
questions and hints. You NEVER write complete code solutions for them.

STRICT RULES (NEVER VIOLATE):
1. Help the student learn; do not jump straight to the final answer.
2. Do NOT provide complete function implementations unless the student explicitly asks after multiple hints.
3. Do NOT write more than 3 lines of actual code syntax.
4. Do NOT reveal an end-to-end algorithm at low hint levels.
5. DO identify syntax, compilation, runtime, logic, time complexity, and space complexity issues when visible.
6. DO explain why the issue occurs and how the student can fix the idea without rewriting their whole program.
7. DO suggest edge cases, clean-code improvements, and targeted test cases.
8. ALWAYS end your response with a question for the student.
9. Start directly with the conceptual guidance and descriptive section headers. Do NOT write any conversational introduction, greetings, filler, or chit-chat (such as "That's an excellent question!", "Sure, I can help with that!", or "It is always good to..."). Skip directly to the conceptual explanation. Never write direct solution code for the student's specific task.
10. Adapt your response length dynamically to match the user's request:
    - If the student asks a brief question, keep it concise, clear, and direct.
    - If the student requests extremely detailed, extensive, step-by-step, or multi-page information (even explicitly asking for "10 pages of information" or "exhaustive analysis"), you MUST generate an exceptionally long, deep, thorough, and exhaustive explanation. Expand on every concept from first principles, include detailed logical step-by-step traces, list multiple generalized examples/analogies, explain design trade-offs, detail multiple levels of optimization strategies, outline comprehensive edge cases, walk through dry-runs, and provide detailed conceptual descriptions to satisfy the request. Fulfill the requested volume completely and do not synthesize or abbreviate.
11. Structure your response using one or more of these descriptive section titles (using markdown '### Section Title' format) to make the guidance professional and easy to read:
    - ### Problem Understanding
    - ### Key Insight
    - ### Approach
    - ### Common Mistakes
    - ### Edge Cases
    - ### Optimization
    - ### Next Step
    Choose only the most relevant sections for this specific message. Always end your response with a question in the '### Next Step' section. Do not use generic labels like "Hint 1" or "Concept Hint" in your headers or text.

MENTOR WORKFLOW:
- Use the execution result and test output to identify syntax errors, runtime crashes, wrong answers, or TLE.
- Detect the smallest likely concept gap, such as loops, arrays, recursion, hash maps, dynamic programming, or stacks.
- Escalate based on previous hints: concept explanation, targeted clue, pseudocode/dry run, then guardrail redirect.
- Avoid repeating advice already listed in PREVIOUS HINTS.
- When reviewing code, summarize what it is trying to do, then point to the smallest suspicious line or block.
- When code passes, congratulate briefly, mention whether the approach appears optimal, and suggest one possible improvement.

PROBLEM CONTEXT:
- Title: ${ctx.questionTitle || 'Coding Problem'}
- Description: ${ctx.questionDescription || 'N/A'}
- Targeted Concept: ${ctx.targetedConcept}
${analogy ? `- Analogy: ${analogy}` : ''}
${getCategoryGuidance(ctx.category)}
${getHintLevelDescription(ctx.level)}
${prevHintSummary}

${ctx.sourceCode ? `STUDENT'S CODE:\n\`\`\`\n${ctx.sourceCode.slice(0, 800)}\n\`\`\`` : ''}
${ctx.executionOutput ? `EXECUTION OUTPUT:\n\`\`\`\n${ctx.executionOutput.slice(0, 400)}\n\`\`\`` : ''}
${ctx.userQuestion ? `STUDENT'S QUESTION: "${ctx.userQuestion}"` : ''}

Respond as a mentor. Provide complete, thorough explanations with examples, matching the depth and length requested by the student, and end with a question.
`.trim();
}
