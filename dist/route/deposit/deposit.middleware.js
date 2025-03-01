import { depositHistoryPostSchema, depositListPostSchema, depositReportPostSchema, depositSchema, updateDepositSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionMemberUser, protectionMerchantAdmin, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const depositMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:deposit-post`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { TopUpFormValues, publicUrls } = await c.req.json();
    const { amount, topUpMode, accountName, accountNumber } = TopUpFormValues;
    const sanitizedData = depositSchema.safeParse({
        amount,
        topUpMode,
        accountName,
        accountNumber,
        publicUrls,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", sanitizedData.data);
    return await next();
};
export const depositPutMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { id } = c.req.param();
    const { status, note } = await c.req.json();
    const sanitizedData = updateDepositSchema.safeParse({
        status,
        note,
        requestId: id,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("sanitizedData", sanitizedData.data);
    return await next();
};
export const depositHistoryPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:deposit-history-get`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { search, page, sortBy, limit, columnAccessor, isAscendingSort, userId, } = await c.req.json();
    const sanitizedData = depositHistoryPostSchema.safeParse({
        search,
        page,
        sortBy,
        limit,
        columnAccessor,
        isAscendingSort,
        userId,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", sanitizedData.data);
    return await next();
};
export const depositListPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:deposit-list-get`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit, search, isAscendingSort, columnAccessor, merchantFilter, userFilter, statusFilter, dateFilter, } = await c.req.json();
    const sanitizedData = depositListPostSchema.safeParse({
        search,
        page,
        limit,
        columnAccessor,
        isAscendingSort,
        merchantFilter,
        userFilter,
        statusFilter,
        dateFilter,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", sanitizedData.data);
    return await next();
};
export const depositReportPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:deposit-list-get`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { dateFilter } = await c.req.json();
    const sanitizedData = depositReportPostSchema.safeParse({
        dateFilter,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", sanitizedData.data);
    return await next();
};
