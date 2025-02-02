import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  messagingBatchPostModel,
  messagingPostModel,
} from "./messaging.model.js";

export const messagingPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    await messagingPostModel(params);

    return c.json("Message sent successfully", 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const messagingBatchPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    await messagingBatchPostModel(params);

    return c.json("Messages batch sent successfully", 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
