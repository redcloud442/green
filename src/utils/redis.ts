import { RedisAPI } from "./redisApi.js";

if (!process.env.REDIS_URL || !process.env.REDIS_PASSWORD) {
  throw new Error("Redis credentials are missing.");
}

export const redis = new RedisAPI(
  process.env.REDIS_URL,
  process.env.REDIS_PASSWORD
);
