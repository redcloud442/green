import { sendErrorResponse } from "../../utils/function.js";
import { emailBatchPostModel, emailPostModel } from "./email.model.js";
export const emailPostController = async (c) => {
    try {
        const params = c.get("params");
        await emailPostModel(params);
        return c.json("Email sent successfully", 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const emailBatchPostController = async (c) => {
    try {
        const { batchData } = c.get("params");
        await emailBatchPostModel(batchData);
        return c.json("Email Batch sent successfully", 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
