import { apiClient } from "./api-client";

export const authService = {
  login: async (identifier: string, password: string) => {
    return apiClient.post("/api/auth/login", {
      email: identifier.includes("@") ? identifier : undefined,
      username: !identifier.includes("@") ? identifier : undefined,
      password,
    });
  },

  signup: async (
    email: string,
    username: string,
    password: string
  ) => {
    return apiClient.post("/api/auth/signup", {
      email,
      username,
      fullName: username,
      password,
    });
  },

  logout: async () => {
    return apiClient.post("/api/auth/logout", {});
  },

  getSession: async () => {
    return apiClient.get("/api/auth/session");
  },
};