export const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp'] as const;
export type SupportedLanguage = typeof LANGUAGES[number];
