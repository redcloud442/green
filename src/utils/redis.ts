import { RedisAPI } from "./redisApi.js";

if (!process.env.REDIS_URL_API || !process.env.REDIS_PASSWORD_API) {
  throw new Error("Redis credentials are missing.");
}

export const redis = new RedisAPI(
  process.env.REDIS_URL_API,
  process.env.REDIS_PASSWORD_API
);
