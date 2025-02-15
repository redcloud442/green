import { sendErrorResponse } from "@/utils/function.js";
import prisma from "@/utils/prisma.js";
import { protectionMemberUser } from "@/utils/protection.js";
import { rateLimit } from "@/utils/redis.js";
import type { Context, Next } from "hono";

export const missionMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const teamMemberProfile = await protectionMemberUser(user.id, prisma);

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${user.id}:mission-get`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  c.set("params", {
    teamMemberProfile,
  });

  return await next();
};
