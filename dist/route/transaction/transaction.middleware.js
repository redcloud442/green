import { transactionSchemaPost } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const transactionPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:transaction-post`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { limit, page } = await c.req.json();
    const validate = transactionSchemaPost.safeParse({ limit, page });
    if (!validate.success) {
        return sendErrorResponse(validate.error.message, 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
