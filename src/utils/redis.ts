import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context } from "hono";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});

/**
 * Rate Limit Function with Dynamic Time Window
 * @param {string} identifier - Unique user key (IP, User ID, etc.)
 * @param {number} maxRequests - Maximum allowed requests
 * @param {string} timeWindow - Time duration (e.g., "10 s", "1 m", "5 m", "1 h")
 * @returns {boolean} - `true` if request is allowed, `false` if rate limit exceeded
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number,
  timeWindow: "10s" | "1m" | "5m" | "1h",
  c: Context
) {
  const ratelimit = new Ratelimit({
    redis: redis as any,
    limiter: Ratelimit.slidingWindow(maxRequests, `${timeWindow}`),
    enableProtection: true,
    analytics: true,
  });

  const { success, pending } = await ratelimit.limit(identifier, {
    ip: c.req.header("x-forwarded-for") || "ip-address",
    userAgent: c.req.header("user-agent") || "user-agent",
    country: c.req.header("cf-ipcountry") || "country",
  });

  await pending;

  return success;
}
