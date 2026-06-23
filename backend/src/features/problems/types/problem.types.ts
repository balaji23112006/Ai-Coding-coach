export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints: string;
  starterCode: unknown;
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
}