const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  post: async <T>(endpoint: string, payload: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },
};