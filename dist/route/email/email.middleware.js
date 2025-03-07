import { emailBatchPostSchema, emailPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin } from "../../utils/protection.js";
import { redis } from "../../utils/redis.js";
export const emailPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const isAllowed = await redis.rateLimit(`rate-limit:${user.id}:email-post`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { to, subject, accountHolderName, accountBank, accountType, accountNumber, transactionDetails, message, greetingPhrase, closingPhrase, signature, } = await c.req.json();
    const sanitizedData = emailPostSchema.safeParse({
        to,
        subject,
        accountHolderName,
        accountBank,
        accountType,
        accountNumber,
        transactionDetails,
        message,
        greetingPhrase,
        closingPhrase,
        signature,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    return await next();
};
export const emailBatchPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const teamMemberProfile = await protectionAdmin(user.id, prisma);
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await redis.rateLimit(`rate-limit:${user.id}:email-post`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { batchData } = await c.req.json();
    const sanitizedData = emailBatchPostSchema.safeParse({
        batchData,
    });
    if (!sanitizedData.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", sanitizedData.data);
    return await next();
};
