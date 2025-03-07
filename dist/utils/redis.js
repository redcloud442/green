import { RedisAPI } from "./redisApi.js";
if (!process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash Redis credentials are missing.");
}
export const redis = new RedisAPI("https://server-redis.redful.xyz", "Blackl300!");
