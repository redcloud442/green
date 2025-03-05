import { sendErrorResponse } from "../../utils/function.js";
import { claimPackagePostModel, packageCreatePostModel, packageGetModel, packageListGetAdminModel, packageListGetModel, packagePostModel, packageUpdatePutModel, } from "./package.model.js";
export const packagePostController = async (c) => {
    try {
        const { amount, packageId } = await c.req.json();
        const user = c.get("user");
        console.log(user);
        const teamMemberProfile = c.get("teamMemberProfile");
        await packagePostModel({
            amount,
            packageId,
            teamMemberProfile: teamMemberProfile,
            user: user,
        });
        return c.json({ message: "Package Availed" });
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packageGetController = async (c) => {
    try {
        const data = await packageGetModel();
        return c.json({ data });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packagesCreatePostController = async (c) => {
    try {
        const { packageName, packageDescription, packagePercentage, packageDays, packageColor, packageImage, } = await c.req.json();
        const result = await packageCreatePostModel({
            packageName,
            packageDescription,
            packagePercentage,
            packageDays,
            packageColor,
            packageImage,
        });
        return c.json({ message: "Package Created", data: result });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packagesUpdatePutController = async (c) => {
    try {
        const { packageData } = await c.req.json();
        const { packageName, packageDescription, packagePercentage, packageDays, packageIsDisabled, packageColor, packageImage, } = packageData;
        const id = c.req.param("id");
        const result = await packageUpdatePutModel({
            packageName,
            packageDescription,
            packagePercentage,
            packageDays,
            packageIsDisabled,
            packageColor,
            packageImage,
            packageId: id,
        });
        return c.json({ message: "Package Updated", data: result });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packagesClaimPostController = async (c) => {
    try {
        const { amount, earnings, packageConnectionId } = await c.req.json();
        const teamMemberProfile = c.get("teamMemberProfile");
        await claimPackagePostModel({
            amount,
            earnings,
            packageConnectionId,
            teamMemberProfile,
        });
        return c.json({ message: "Package Claimed" });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packagesListPostController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await packageListGetModel({ teamMemberProfile });
        return c.json({ data });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const packagesGetAdminController = async (c) => {
    try {
        const data = await packageListGetAdminModel();
        return c.json({ data });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
