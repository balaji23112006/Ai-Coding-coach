import { prisma } from '../../../database/prisma.js';
import { Prisma, UserProfile } from '@prisma/client';

export class ProfileRepository {
  /**
   * Retrieves a UserProfile by the user's ID.
   * @param userId The unique user ID.
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  /**
   * Saves a new UserProfile.
   * @param profile The profile creation payload.
   */
  async saveProfile(profile: Prisma.UserProfileCreateInput): Promise<UserProfile> {
    return prisma.userProfile.create({
      data: profile,
    });
  }

  /**
   * Updates an existing UserProfile.
   * @param profile The profile update payload including the target userId.
   */
  async updateProfile(
    profile: { userId: string } & Prisma.UserProfileUpdateInput,
  ): Promise<UserProfile> {
    const { userId, ...data } = profile;
    return prisma.userProfile.update({
      where: { userId },
      data,
    });
  }
}

export const profileRepository = new ProfileRepository();
