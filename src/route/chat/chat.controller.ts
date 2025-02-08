import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";

import {
  chatRequestSessionModel,
  chatSessionGetMessageModel,
  chatSessionPostModel,
  chatSessionPutModel,
} from "./chat.model.js";

export const chatSessionPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const data = await chatSessionPostModel(params);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const chatSessionGetController = async (c: Context) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");

    await chatSessionPutModel(params, teamMemberProfile);

    return c.json("Successfully updated", 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const chatSessionGetMessageController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await chatSessionGetMessageModel(teamMemberProfile);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const chatRequestSessionController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await chatRequestSessionModel(teamMemberProfile);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
