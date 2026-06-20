import type { AchievementBadge, UserProfile } from '../types';

export const initialUserData: UserProfile = {
  name: 'User',
  username: '0',
  bio: '0',
  email: 'user@gmail.com',
  joinDate: 'dd-mm-yyyy',
  role: '0',
  language: '0',
};

export const roles = [
  'Student',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Data Scientist',
];

export const languages = ['TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'];

export const badges: AchievementBadge[] = [];
