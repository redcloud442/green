import { sendErrorResponse } from "../../utils/function.js";
import { notificationGetModel, notificationGetPackageModel, notificationPostModel, notificationPutModel, saveNotificationModel, turnOffNotificationModel, updateNotificationModel, } from "./notification.model.js";
export const notificationPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const notifications = await notificationPostModel({
            ...params,
            teamMemberId: teamMemberProfile.alliance_member_id,
        });
        return c.json({
            message: "Notification sent successfully",
            data: notifications,
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationPutController = async (c) => {
    try {
        const { batchData } = c.get("params");
        await notificationPutModel({
            batchData,
        });
        return c.json({
            message: "Notification sent successfully",
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationGetController = async (c) => {
    try {
        const params = c.get("params");
        const notifications = await notificationGetModel(params);
        return c.json({
            message: "Notification fetched successfully",
            data: notifications,
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificatioPutController = async (c) => {
    try {
        const { take, teamMemberId } = c.get("params");
        const notifications = await updateNotificationModel({
            teamMemberId,
            take,
        });
        return c.json({
            message: "Notification fetched successfully",
            data: notifications,
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationPutNotificationController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const notifications = await updateNotificationModel({
            teamMemberId: teamMemberProfile.alliance_member_id,
            take: 10,
        });
        return c.json({
            message: "Notification fetched successfully",
            data: notifications,
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationPostPackageController = async (c) => {
    try {
        const { startAmount, endAmount } = c.get("params");
        await saveNotificationModel({
            startAmount,
            endAmount,
        });
        return c.json({
            message: "Notification saved successfully",
        }, 200);
    }
    catch (error) {
        console.error("Error saving notification:", error);
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationControlController = async (c) => {
    try {
        const { message } = c.get("params");
        if (message === "START") {
            await turnOffNotificationModel({ message: "START" });
        }
        else if (message === "STOP") {
            await turnOffNotificationModel({ message: "STOP" });
        }
        return c.json({
            message: "Notification control updated successfully",
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const notificationGetPackageController = async (c) => {
    try {
        const notifications = await notificationGetPackageModel();
        return c.json({
            message: "Notification control fetched successfully",
            data: notifications,
        });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
