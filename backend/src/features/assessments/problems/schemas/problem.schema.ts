import { z } from 'zod';

export const getQuestionsQuerySchema = z.object({
  page: z
    .any()
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 1;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }),
  pageSize: z
    .any()
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 20;
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) || parsed <= 0 ? 20 : parsed;
    }),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  topic: z.string().optional(),
  search: z.string().optional(),
});

export type GetQuestionsQuery = z.infer<typeof getQuestionsQuerySchema>;
