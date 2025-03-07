import type { Context, Next } from "hono";
import { dashboardPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionClient } from "../../utils/protection.js";
import { redis } from "../../utils/redis.js";

export const dashboardPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:dashboard-post`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { dateFilter } = await c.req.json();

  const validate = dashboardPostSchema.safeParse({ dateFilter });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("dateFilter", dateFilter);

  await next();
};

export const dashboardGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:dashboard-get`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  await next();
};

export const dashboardPostClientMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionClient(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:dashboard-post-client`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { dateFilter } = await c.req.json();

  const validate = dashboardPostSchema.safeParse({ dateFilter });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("dateFilter", dateFilter);

  await next();
};
