/**
 * Authentication Service (BetterAuth Wrapper Placeholder)
 * Manages user sessions, registration, login and session status checks.
 */

export const authService = {
  login: async (email: string, _password: string): Promise<boolean> => {
    console.warn(`[Auth Service] Mock Login with ${email}`);
    return true;
  },
  logout: async (): Promise<void> => {
    console.warn('[Auth Service] Mock Logout');
  },
  getSession: async (): Promise<{ user: { id: string; name: string } | null }> => {
    return { user: null };
  },
};
