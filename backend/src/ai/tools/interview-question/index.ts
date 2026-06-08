/**
 * Interview Question Tool Placeholder
 * Generates conceptual questions during active practice sessions.
 */

export const interviewQuestionTool = {
  name: 'interview_question',
  description:
    'Generates user specific conceptual and behavioral follow-up interview questions regarding their submission.',
  execute: async (submissionId: string): Promise<{ questions: string[] }> => {
    console.warn(
      `[Tool: Interview Question] Generating follow-up questions for submission ${submissionId}`,
    );
    return {
      questions: [
        'How would you optimize the space complexity of your solution?',
        'What are the edge cases your approach could fail on?',
      ],
    };
  },
};
