import type { Context, Next } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { redis } from "../../utils/redis.js";

export const missionMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile || !teamMemberProfile.alliance_member_is_active) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${user.id}:mission-get`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  c.set("teamMemberProfile", { teamMemberProfile });

  return await next();
};

export const missionPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile || !teamMemberProfile.alliance_member_is_active) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${user.id}:mission-post`,
    10,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  c.set("teamMemberProfile", { teamMemberProfile });

  return await next();
};
