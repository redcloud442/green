import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const missionMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionMemberUser(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:mission-get`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
export const missionPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionMemberUser(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${user.id}:mission-post`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    return await next();
};
