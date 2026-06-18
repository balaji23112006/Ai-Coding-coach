// src/features/mentor/mentor.service.ts
import { logger } from '../../shared/utils/logger.js';
import { mapStringToLanguage } from '../../execution/types/execution.types.js';

// Placeholder external tools – in real implementation they'd call actual services or DB
async function get_hint_history(userId: string, questionId: string) {
  // TODO: fetch from DB
  return [];
}
async function get_question_metadata(questionId: string) {
  // TODO: fetch from DB
  return { description: '', constraints: '', starterCode: '' };
}
async function get_concept_analogy(topic: string) {
  const analogies: Record<string, string> = {
    loop: 'Imagine walking around a circular track; each step moves you to the next position.',
    hashmap: 'Think of a phone book where you look up a name to get a number quickly.',
    recursion: 'Like a set of nested Russian dolls, each one contains a smaller copy of itself.',
    'dynamic programming': 'Building a table of solutions step by step, like filling out a spreadsheet.'
  };
  return analogies[topic] ?? '';
}
async function save_hint_log(data: any) {
  // TODO: persist hint log
  logger.info('Saved hint log', data);
}

export class MentorService {
  async generateHint(request: {
    userId: string;
    questionId: string;
    sourceCode: string;
    language: string;
    executionResult: { status: string; stdout: string; stderr: string };
    previousChat?: any[];
  }) {
    const { userId, questionId, language, executionResult } = request;

    // 1. Fetch history & metadata
    const [hintHistory, questionMeta] = await Promise.all([
      get_hint_history(userId, questionId),
      get_question_metadata(questionId)
    ]);

    // 2. Classify error type
    let category: 'syntax' | 'logic' | 'efficiency' = 'logic';
    if (executionResult.status === 'COMPILE_ERROR' || executionResult.status === 'RUNTIME_ERROR') {
      category = executionResult.status.includes('COMPILE') ? 'syntax' : 'logic';
    }
    if (executionResult.stdout?.includes('Time Limit Exceeded')) {
      category = 'efficiency';
    }

    // 3. Determine hint level based on history length
    const level = Math.min(hintHistory.length + 1, 4);

    // 4. Choose a concept to explain (very simple heuristic)
    let concept = '';
    if (category === 'syntax') concept = 'syntax';
    else if (category === 'logic') concept = 'loop';
    else concept = 'efficiency';
    const analogy = await get_concept_analogy(concept);

    // 5. Build hint
    let mentorFeedback = '';
    if (level === 1) {
      mentorFeedback = `Remember that ${concept} concepts are essential. ${analogy}`;
    } else if (level === 2) {
      mentorFeedback = `Check the part of your code where you handle ${concept}s. Is there an off‑by‑one mistake or a missing condition?`;
    } else if (level === 3) {
      mentorFeedback = `Try writing a short pseudocode for the ${concept} part of your solution. How would you iterate over the input?`;
    } else {
      mentorFeedback = `Consider reviewing similar problems or discussing with peers to solidify the ${concept} idea.`;
    }
    // End with a guiding question
    mentorFeedback += ' What do you think might be causing the current failure?';

    const hintMetadata = {
      category,
      level,
      targetedConcept: concept
    };

    // 6. Save hint log
    await save_hint_log({ userId, questionId, category, level, concept, timestamp: new Date().toISOString() });

    logger.debug('Generated mentor hint', { mentorFeedback, hintMetadata });
    return { mentorFeedback, hintMetadata };
  }
}

export const mentorService = new MentorService();
