import { prisma } from '../../../database/prisma.js';
import { Prisma, Profile } from '@prisma/client';

export class ProfileRepository {
  /**
   * Retrieves a UserProfile by the user's ID.
   * @param userId The unique user ID.
   */
  async getProfile(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { userId },
    });
  }

  /**
   * Saves a new UserProfile.
   * @param profile The profile creation payload.
   */
  async saveProfile(profile: Prisma.ProfileCreateInput): Promise<Profile> {
    return prisma.profile.create({
      data: profile,
    });
  }

  /**
   * Updates an existing UserProfile.
   * @param profile The profile update payload including the target userId.
   */
  async updateProfile(profile: { userId: string } & Prisma.ProfileUpdateInput): Promise<Profile> {
    const { userId, ...data } = profile;
    return prisma.profile.update({
      where: { userId },
      data,
    });
  }
}

export const profileRepository = new ProfileRepository();
