import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  notificationGetModel,
  notificationPostModel,
  notificationPutModel,
  updateNotificationModel,
} from "./notification.model.js";

export const notificationPostController = async (c: Context) => {
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
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const notificationPutController = async (c: Context) => {
  try {
    const { batchData } = c.get("params");

    await notificationPutModel({
      batchData,
    });

    return c.json({
      message: "Notification sent successfully",
    });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const notificationGetController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const notifications = await notificationGetModel({
      teamMemberId: teamMemberProfile.alliance_member_id,
      take: 10,
    });

    return c.json({
      message: "Notification fetched successfully",
      data: notifications,
    });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const notificatioPutController = async (c: Context) => {
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
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const notificationPutNotificationController = async (c: Context) => {
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
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
