// Simple in-memory sliding-window rate limiter.
// Works per-process (fine for Vercel serverless — each function instance is isolated).
// Key is typically `"ip::<ip>"` or `"user::<id>"`.

const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if it should be blocked.
 * @param key      Unique identifier for the caller (IP, user ID, …)
 * @param limit    Max requests allowed within the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/** Convenience: extract caller IP from a Next.js request. */
export function getIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}
