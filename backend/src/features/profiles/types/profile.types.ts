import { UserProfile as PrismaUserProfile, Submission as PrismaSubmission } from '@prisma/client';

export type SkillRatings = Record<string, number>;

export interface UserProfile extends Omit<PrismaUserProfile, 'skills'> {
  skills: SkillRatings;
}

export type SubmissionWithQuestion = PrismaSubmission & {
  question?: {
    id: string;
    title: string;
    difficulty: string;
  } | null;
};

export interface CreateProfileInput {
  userId: string;
  skills?: SkillRatings;
  solvedCount?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  learningTrack?: string | null;
  experienceLevel?: string | null;
  recommendedFocus?: string | null;
  recommendedDifficulty?: string | null;
}

export interface UpdateProfileInput {
  skills?: SkillRatings;
  solvedCount?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  learningTrack?: string | null;
  experienceLevel?: string | null;
  recommendedFocus?: string | null;
  recommendedDifficulty?: string | null;
}
