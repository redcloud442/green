import { sendErrorResponse } from "../../utils/function.js";
import { chatRequestSessionModel, chatSessionGetMessageIdModel, chatSessionGetMessageModel, chatSessionPostModel, chatSessionPutModel, } from "./chat.model.js";
export const chatSessionPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await chatSessionPostModel(params);
        return c.json(data, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const chatSessionGetController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        await chatSessionPutModel(params, teamMemberProfile);
        return c.json("Successfully updated", 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const chatSessionGetMessageController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await chatSessionGetMessageModel(teamMemberProfile);
        return c.json(data, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const chatRequestSessionController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await chatRequestSessionModel(teamMemberProfile);
        return c.json(data, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const chatSessionGetMessageIdController = async (c) => {
    try {
        const params = c.get("params");
        const data = await chatSessionGetMessageIdModel(params);
        return c.json(data, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
