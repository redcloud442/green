import { sendErrorResponse } from "../../utils/function.js";
import { notificationPostModel, notificationPutModel, } from "./notification.model.js";
export const notificationPostController = async (c) => {
    try {
        const { page, limit } = c.get("params");
        const notifications = await notificationPostModel({
            page,
            limit,
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
