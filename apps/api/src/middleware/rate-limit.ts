import type { Context, Next } from "hono";

// Simple in-memory rate limiting (no Redis required)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function rateLimitSearch() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "anonymous";
    const key = getRateLimitKey(ip, "search");
    const { allowed, remaining } = checkRateLimit(key, 10, 10 * 60 * 1000); // 10 requests per 10 minutes

    c.header("X-RateLimit-Limit", "10");
    c.header("X-RateLimit-Remaining", String(remaining));

    if (!allowed) {
      return c.json({ error: "Too many requests. Try again in 10 minutes." }, 429);
    }

    return next();
  };
}

export function rateLimitGenerate() {
  return async (c: Context, next: Next) => {
    const userId = c.req.header("x-user-id") ?? c.req.header("x-session-id") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const key = getRateLimitKey(userId, "generate");
    const { allowed, remaining } = checkRateLimit(key, 3, 5 * 60 * 1000); // 3 requests per 5 minutes

    c.header("X-RateLimit-Limit", "3");
    c.header("X-RateLimit-Remaining", String(remaining));

    if (!allowed) {
      return c.json({ error: "Too many generation requests. Try again in 5 minutes." }, 429);
    }

    return next();
  };
}
