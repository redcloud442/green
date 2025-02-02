import { envConfig } from "../../env.js";
import { sendErrorResponse } from "../../utils/function.js";
const apiKey = envConfig.MOVIDER_API_KEY;
const apiSecret = envConfig.MOVIDER_API_SECRET;
export const messagingPostModel = async (params) => {
    const { number, message } = params;
    const bodyParams = new URLSearchParams();
    bodyParams.append("to", number.startsWith("09")
        ? `63${number.slice(1)}`
        : number.startsWith("63")
            ? number
            : `63${number}`);
    bodyParams.append("text", message);
    bodyParams.append("api_key", apiKey);
    bodyParams.append("api_secret", apiSecret);
    const response = await fetch("https://api.movider.co/v1/sms", {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        },
        body: bodyParams.toString(),
    });
    const result = await response.json();
    if (!response.ok) {
        return sendErrorResponse(result.message || "Failed to send SMS", 500);
    }
    return result;
};
export const messagingBatchPostModel = async (params) => {
    const { number, message } = params;
    const formattedNumbers = number
        .map((num) => {
        const cleaned = num.replace(/[^0-9+]/g, "").trim();
        return cleaned;
    })
        .filter((num) => /^\+\d{10,15}$/.test(num))
        .join(",");
    if (!formattedNumbers) {
        throw new Error("No valid numbers provided.");
    }
    const bodyParams = new URLSearchParams();
    bodyParams.append("to", formattedNumbers);
    bodyParams.append("text", message);
    bodyParams.append("api_key", apiKey);
    bodyParams.append("api_secret", apiSecret);
    // Send the request to the Movider API
    const response = await fetch("https://api.movider.co/v1/sms", {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        },
        body: bodyParams.toString(),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to send SMS");
    }
    return result;
};
