import { z } from 'zod';

const SUPPORTED_LANGUAGES = ['javascript', 'python'] as const;

export const runCodeSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES, {
    message: "Language must be 'javascript' or 'python'",
  }),
  sourceCode: z
    .string()
    .min(1, 'Source code must not be empty')
    .max(65536, 'Source code size must be under 64KB'),
});

export const submitCodeSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES, {
    message: "Language must be 'javascript' or 'python'",
  }),
  sourceCode: z
    .string()
    .min(1, 'Source code must not be empty')
    .max(65536, 'Source code size must be under 64KB'),
  userId: z.string().optional().nullable(),
  questionId: z.string().optional().nullable(),
});

export type RunCodeInput = z.infer<typeof runCodeSchema>;
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;

