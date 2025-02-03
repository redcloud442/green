import { sendErrorResponse } from "../../utils/function.js";
import { notificationGetModel, notificationPostModel, notificationPutModel, updateNotificationModel, } from "./notification.model.js";
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
