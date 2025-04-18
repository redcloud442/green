import { claimPackagePutSchema, createPackagePostSchema, packagePostSchema, updatePackageFundSchema, updatePackageSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionMemberUser, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const packagePostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile, user: userData } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-post`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { amount, packageId } = await c.req.json();
    const { success } = packagePostSchema.safeParse({ amount, packageId });
    if (!success) {
        return c.json({ message: "Invalid request" }, 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("user", userData);
    await next();
};
export const packagePostListMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
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
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
export const packageGetMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-get`, 50, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
export const packageCreatePostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { packageName, packageDescription, packagePercentage, packageDays, packageColor, packageImage, } = await c.req.json();
    const validation = createPackagePostSchema.safeParse({
        packageName,
        packageDescription,
        packagePercentage,
        packageDays,
        packageColor,
        packageImage,
    });
    if (!validation.success) {
        return sendErrorResponse("Invalid request", 400);
    }
    await next();
};
export const packageUpdatePutMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-update`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { packageData } = await c.req.json();
    const { packageName, packageDescription, packagePercentage, packageDays, packageIsDisabled, packageColor, packageImage, } = packageData;
    const id = c.req.param("id");
    const validation = updatePackageSchema.safeParse({
        packageName,
        packageDescription,
        packagePercentage,
        packageDays,
        packageIsDisabled,
        packageColor,
        packageImage,
        packageId: id,
    });
    if (!validation.success) {
        return sendErrorResponse("Invalid request", 400);
    }
    await next();
};
export const packagesClaimPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-claim`, 10, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { amount, earnings, packageConnectionId } = await c.req.json();
    const validation = claimPackagePutSchema.safeParse({
        amount,
        earnings,
        packageConnectionId,
    });
    if (!validation.success) {
        return sendErrorResponse("Invalid request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
export const packagesGetListMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-list`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
export const packagesUpdateFundPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:package-list`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { type, amount } = await c.req.json();
    const validation = updatePackageFundSchema.safeParse({
        amount,
        type,
    });
    if (!validation.success) {
        console.log(validation.error);
        return sendErrorResponse("Invalid request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", validation.data);
    await next();
};
