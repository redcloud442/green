import { notificationBatchPostSchema, notificationBatchPutSchema, socketGetNotificationSchema, socketPostControlSchema, socketPostPackageSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionMemberUser, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const notificationPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:email-post`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const sanitizedData = notificationBatchPostSchema.safeParse({
        page,
        limit,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationPutMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-get`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { batchData } = await c.req.json();
    const sanitizedData = notificationBatchPutSchema.safeParse({
        batchData,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationGetMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionMemberUser(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-get`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { take, skip, teamMemberId } = await c.req.json();
    const validatedData = socketGetNotificationSchema.safeParse({
        take,
        skip,
        teamMemberId,
    });
    if (!validatedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validatedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationPutNotificationMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionMemberUser(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-get`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { take, teamMemberId } = await c.req.json();
    const validatedData = socketGetNotificationSchema.safeParse({
        take,
        teamMemberId,
    });
    if (!validatedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validatedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationPostPackageMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-post-package`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { startAmount, endAmount } = await c.req.json();
    const validatedData = socketPostPackageSchema.safeParse({
        startAmount,
        endAmount,
    });
    if (!validatedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validatedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationControlMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-post-package`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { message } = await c.req.json();
    const validatedData = socketPostControlSchema.safeParse({
        message,
    });
    if (!validatedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validatedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const notificationGetPackageMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:notification-post-package`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
