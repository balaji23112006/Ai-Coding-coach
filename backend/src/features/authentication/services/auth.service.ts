import { prisma } from '../../../database/prisma.js';

export class AuthService {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async resolveEmail(identifier: string): Promise<string | null> {
    if (identifier.includes('@')) {
      return identifier;
    }

    const user = await this.findUserByUsername(identifier);
    if (!user) {
      return null;
    }
    return user.email;
  }
}
