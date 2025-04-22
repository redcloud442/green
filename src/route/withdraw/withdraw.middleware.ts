import type { Context, Next } from "hono";
import {
  updateWithdrawSchema,
  withdrawalFormSchema,
  withdrawBanListGetSchema,
  withdrawBanListPostSchema,
  withdrawCashWithdrawalListExportSchema,
  withdrawHistoryPostSchema,
  withdrawHistoryReportPostSchema,
  withdrawListPostSchema,
  withdrawPostSchema,
  withdrawTotalReportPostSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import {
  protectionAccountingAdmin,
  protectionAccountingMerchantAdmin,
  protectionMemberUser,
} from "../../utils/protection.js";
import { rateLimit, redis } from "../../utils/redis.js";

export const withdrawPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-post`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { earnings, accountNumber, accountName, amount, bank } =
    await c.req.json();

  const key = `withdraw-ban-list`;

  const existingList = await redis.lrange(key, 0, -1);

  const normalizedAccountNumber = String(accountNumber).trim();

  const isDuplicate = existingList.some(
    (entry) => String(entry).trim() === normalizedAccountNumber
  );

  if (isDuplicate) {
    return sendErrorResponse("Invalid account number", 400);
  }

  const amountWithoutCommas = amount.replace(/,/g, "");

  const validate = withdrawPostSchema.safeParse({
    earnings,
    accountNumber,
    accountName,
    amount: amountWithoutCommas,
    bank,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  c.set("params", validate.data);

  await next();
};

export const withdrawCashOutMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-post`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { amount, fullName, cellphoneNumber } = await c.req.json();

  const amountWithoutCommas = amount.replace(/,/g, "");

  const validate = withdrawalFormSchema.safeParse({
    amount: amountWithoutCommas,
    fullName,
    cellphoneNumber,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  c.set("params", validate.data);

  await next();
};

export const withdrawHistoryPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-history-get`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { page, limit, search, columnAccessor, isAscendingSort, userId } =
    await c.req.json();

  const validate = withdrawHistoryPostSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userId,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const updateWithdrawMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:update-withdraw`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { status, note } = await c.req.json();

  const { id } = c.req.param();

  const validate = updateWithdrawSchema.safeParse({
    status,
    note,
    requestId: id,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const withdrawListPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-list-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const {
    page,
    limit,
    search,
    columnAccessor,
    userFilter,
    statusFilter,
    isAscendingSort,
    dateFilter,
  } = await c.req.json();

  const validate = withdrawListPostSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    userFilter,
    statusFilter,
    isAscendingSort,
    dateFilter,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-list-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const withdrawHistoryReportPostMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-history-report-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { dateFilter } = await c.req.json();

  const validate = withdrawHistoryReportPostSchema.safeParse(dateFilter);

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawTotalReportPostMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-history-report-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { type, take, skip } = await c.req.json();

  const validate = withdrawTotalReportPostSchema.safeParse({
    type,
    take,
    skip,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawBanListPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingMerchantAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-history-report-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { accountNumber } = await c.req.json();

  const validate = withdrawBanListPostSchema.safeParse({
    accountNumber,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawBanListGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingMerchantAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-ban-list-get`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { take, skip } = c.req.query();

  if (!take || !skip) {
    return sendErrorResponse("Take and skip are required", 400);
  }

  const validate = withdrawBanListGetSchema.safeParse({
    take,
    skip,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawBanListDeleteMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingMerchantAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-ban-list-get`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { accountNumber } = c.req.param();

  if (!accountNumber) {
    return sendErrorResponse("Account number is required", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", { accountNumber });

  await next();
};

export const withdrawCashWithdrawalListExportMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingMerchantAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-ban-list-get`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { take, skip, dateFilter } = await c.req.json();

  if (!take || !skip) {
    return sendErrorResponse("Take and skip are required", 400);
  }

  const validate = withdrawCashWithdrawalListExportSchema.safeParse({
    take,
    skip,
    dateFilter,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};
