import { redis } from "@/utils/redis.js";
import type { Context, Next } from "hono";
import {
  userChangePasswordSchema,
  userGenerateLinkSchema,
  userListReinvestedSchema,
  userListSchema,
  userPreferredBankSchema,
  userProfileDataSchema,
  userProfileSchemaPatch,
  userSchemaPatch,
  userSchemaPost,
  userSchemaPut,
  userSponsorSchema,
  userTreeSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import {
  protectionAdmin,
  protectionMemberUser,
} from "../../utils/protection.js";

export const userPutMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-put`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { email, userId, password } = await c.req.json();

  const validate = userSchemaPut.safeParse({ email, userId, password });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const userPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-post`,
    1,
    60
  );

  console.log(isAllowed);
  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { memberId } = await c.req.json();

  const validate = userSchemaPost.safeParse({ memberId });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const userGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-get`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userPatchMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-patch`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const { action = "updateRole", role, type } = await c.req.json();

  const validate = userSchemaPatch.safeParse({
    memberId: id,
    action,
    role,
    type,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userSponsorMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-sponsor`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { userId } = await c.req.json();

  const validate = userSponsorSchema.safeParse({ userId });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userProfilePutMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-profile-update`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const { profilePicture } = await c.req.json();

  const validate = userProfileSchemaPatch.safeParse({
    profilePicture,
    userId: id,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userGenerateLinkMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-generate-link`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { formattedUserName } = await c.req.json();

  const validate = userGenerateLinkSchema.safeParse({
    formattedUserName,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userListMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-list`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
  } = await c.req.json();

  const validate = userListSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const userActiveListMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-active-list`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
    type,
  } = await c.req.json();

  const validate = userListSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
    type,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const userChangePasswordMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-profile-update`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const { password } = await c.req.json();

  const validate = userChangePasswordSchema.safeParse({
    password,
    userId: id,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const userPreferredBankMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-profile-update`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { accountNumber, accountName, bankName } = await c.req.json();

  const validate = userPreferredBankSchema.safeParse({
    accountNumber,
    accountName,
    bankName,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const userProfileDataPutMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await redis.rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-profile-update`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const { type, value } = await c.req.json();

  const validate = userProfileDataSchema.safeParse({
    value,
    type,
    userId: id,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("params", validate.data);

  await next();
};

export const userListReinvestedMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-list-reinvested`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { dateFilter, take, skip } = await c.req.json();

  const validate = userListReinvestedSchema.safeParse({
    dateFilter,
    take,
    skip,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("params", validate.data);

  await next();
};

export const userTreeMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-tree`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const validate = userTreeSchema.safeParse({
    memberId: id,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("params", validate.data);

  await next();
};
