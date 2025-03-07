import type { Context, Next } from "hono";
import { userOptionsPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMerchantAdmin } from "../../utils/protection.js";
import { redis } from "../../utils/redis.js";

export const userOptionsPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMerchantAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-options-post`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { page, limit } = await c.req.json();

  const validation = userOptionsPostSchema.safeParse({
    page,
    limit,
  });

  if (!validation.success) {
    return sendErrorResponse("Invalid request", 400);
  }

  c.set("params", validation.data);

  await next();
};
