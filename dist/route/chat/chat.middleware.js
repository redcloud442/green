import { chatSessionGetSchema, chatSessionPostSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionMemberUser, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const chatSessionPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:chat-session-post`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const sanitizedData = chatSessionPostSchema.safeParse({
        page,
        limit,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    return await next();
};
export const chatSessionGetMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:chat-session-get`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { id } = c.req.param();
    const sanitizedData = chatSessionGetSchema.safeParse({
        sessionId: id,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const chatSessionGetMessageMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:chat-session-get`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const chatRequestSessionMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:chat-session-request`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const chatSessionGetMessageIdMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:chat-session-message-id`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { id } = c.req.param();
    console.log(id);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("params", { id });
    return await next();
};
