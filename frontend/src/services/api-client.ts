/**
 * API Client Service Placeholder
 * Provides baseline fetch wrappers for communication with the Express backend.
 */

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    console.warn(`[API Client] Mock GET called for ${endpoint}`);
    return {} as T;
  },
  post: async <T>(endpoint: string, payload: unknown): Promise<T> => {
    console.warn(`[API Client] Mock POST called for ${endpoint}`, payload);
    return {} as T;
  },
  put: async <T>(endpoint: string, payload: unknown): Promise<T> => {
    console.warn(`[API Client] Mock PUT called for ${endpoint}`, payload);
    return {} as T;
  },
  delete: async <T>(endpoint: string): Promise<T> => {
    console.warn(`[API Client] Mock DELETE called for ${endpoint}`);
    return {} as T;
  }
};
