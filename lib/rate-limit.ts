export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  // Periodically clean up expired entries to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (data.resetAt < now) {
        requests.delete(key);
      }
    }
  }, Math.max(options.windowMs, 60000));

  return {
    check: (key: string): { allowed: boolean; remaining: number; resetAt: number } => {
      const now = Date.now();
      let data = requests.get(key);

      if (!data || data.resetAt < now) {
        data = { count: 0, resetAt: now + options.windowMs };
      }

      data.count++;
      requests.set(key, data);

      const remaining = Math.max(0, options.maxRequests - data.count);
      return {
        allowed: data.count <= options.maxRequests,
        remaining,
        resetAt: data.resetAt,
      };
    },
  };
}
