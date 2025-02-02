import { notificationBatchPostSchema, notificationBatchPutSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const notificationPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:email-post`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const sanitizedData = notificationBatchPostSchema.safeParse({
        page,
        limit,
    });
    if (!sanitizedData.success) {
        console.log(sanitizedData.error);
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
