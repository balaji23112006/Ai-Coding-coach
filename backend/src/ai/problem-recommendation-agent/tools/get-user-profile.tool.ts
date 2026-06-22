import { profileRepository } from "../../../features/profiles/repository/profile.repository.js";

export async function getUserProfile(
  userId: string
) {
  const profile =
    await profileRepository.getProfile(userId);

  return profile;
}