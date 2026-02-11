import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context, Next } from "hono";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export const searchRateLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "skilledclaws:search",
  });

export const generateRateLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "5 m"),
    prefix: "skilledclaws:generate",
  });

export function rateLimitSearch() {
  return async (c: Context, next: Next) => {
    if (!searchRateLimiter) {
      return next();
    }
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "anonymous";
    const { success, limit, remaining } = await searchRateLimiter.limit(ip);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    if (!success) {
      return c.json({ error: "Too many requests. Try again in 10 minutes." }, 429);
    }
    return next();
  };
}

export function rateLimitGenerate() {
  return async (c: Context, next: Next) => {
    if (!generateRateLimiter) {
      return next();
    }
    const userId = c.req.header("x-user-id") ?? c.req.header("x-session-id") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const { success, limit, remaining } = await generateRateLimiter.limit(userId);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    if (!success) {
      return c.json({ error: "One skill generation per 5 minutes. Try again later." }, 429);
    }
    return next();
  };
}
