import { Langfuse } from 'langfuse';

let _langfuse: Langfuse | null = null;

/**
 * Lazily initialized Langfuse client.
 * This avoids the import-hoisting problem where `new Langfuse()` runs
 * at module load time before `dotenv.config()` has populated process.env.
 */
export function getLangfuse(): Langfuse {
  if (!_langfuse) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl =
      process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

    if (!publicKey || !secretKey) {
      console.log(
        `[Langfuse] Telemetry disabled (LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY missing)`,
      );
      // Return a dummy object that implements the required methods as no-ops
      _langfuse = {
        trace: () => ({
          generation: () => ({}),
          span: () => ({}),
          event: () => ({}),
          update: () => ({}),
        }),
        flushAsync: async () => {},
      } as unknown as Langfuse;
    } else {
      console.log(
        `[Langfuse] Initializing client → host=${baseUrl}, publicKey=${publicKey.slice(0, 20)}...`,
      );
      _langfuse = new Langfuse({ publicKey, secretKey, baseUrl });
    }
  }
  return _langfuse;
}

// Backward-compatible export: proxies all property access to the lazily-initialized instance.
export const langfuse: Langfuse = new Proxy({} as Langfuse, {
  get(_target, prop, _receiver) {
    const instance = getLangfuse();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
