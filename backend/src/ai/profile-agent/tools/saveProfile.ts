import { prisma } from '../../../database/prisma.js';
import { UserProfile } from '@prisma/client';

export interface SaveProfileParams {
  userId: string;
  skills?: Record<string, number>;
  solvedCount?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  learningTrack?: string | null;
  experienceLevel?: string | null;
  recommendedFocus?: string | null;
  recommendedDifficulty?: string | null;
}

/**
 * Saves or updates (upserts) the UserProfile for a user.
 * @param params The profile updates or initialization data.
 */
export async function saveProfile(params: SaveProfileParams): Promise<UserProfile> {
  const {
    userId,
    skills,
    solvedCount,
    easySolved,
    mediumSolved,
    hardSolved,
    learningTrack,
    experienceLevel,
    recommendedFocus,
    recommendedDifficulty,
  } = params;
  try {
    return await (prisma.userProfile as any).upsert({
      where: { userId },
      create: {
        userId,
        skills: skills ?? {},
        solvedCount: solvedCount ?? 0,
        easySolved: easySolved ?? 0,
        mediumSolved: mediumSolved ?? 0,
        hardSolved: hardSolved ?? 0,
        learningTrack: learningTrack ?? null,
        experienceLevel: experienceLevel ?? null,
        recommendedFocus: recommendedFocus ?? null,
        recommendedDifficulty: recommendedDifficulty ?? null,
      },
      update: {
        ...(skills !== undefined && { skills }),
        ...(solvedCount !== undefined && { solvedCount }),
        ...(easySolved !== undefined && { easySolved }),
        ...(mediumSolved !== undefined && { mediumSolved }),
        ...(hardSolved !== undefined && { hardSolved }),
        ...(learningTrack !== undefined && { learningTrack }),
        ...(experienceLevel !== undefined && { experienceLevel }),
        ...(recommendedFocus !== undefined && { recommendedFocus }),
        ...(recommendedDifficulty !== undefined && { recommendedDifficulty }),
      },
    });
  } catch (error) {
    console.error(`[Tool: saveProfile] Error saving profile for user ${userId}:`, error);
    throw new Error(
      `Failed to save user profile: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const saveProfileTool = {
  name: 'saveProfile',
  description:
    "Saves or updates a user's skill profile, including coding category scores and solved problem statistics.",
  execute: async (params: SaveProfileParams): Promise<UserProfile> => {
    return await saveProfile(params);
  },
};
