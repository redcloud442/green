import type { Context, Next } from "hono";
import {
  messagingBatchPostSchema,
  messagingPostSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";

export const messagingPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const isAllowed = await rateLimit(
    `rate-limit:${user.id}:email-post`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { number, message } = await c.req.json();

  const sanitizedData = messagingPostSchema.safeParse({
    number,
    message,
  });

  if (!sanitizedData.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("params", sanitizedData.data);

  return await next();
};

export const messagingBatchPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const teamMemberProfile = await protectionMemberUser(user.id, prisma);

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${user.id}:email-post`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { number, message } = await c.req.json();

  const sanitizedData = messagingBatchPostSchema.safeParse({
    number,
    message,
  });

  if (!sanitizedData.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("params", sanitizedData.data);

  return await next();
};
