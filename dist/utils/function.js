import { supabaseClient } from "./supabase.js";
export const sendErrorResponse = (message, status) => Response.json({ message: message }, { status });
export const sendSuccessResponse = (message, status) => Response.json({ message: message }, { status });
export const getClientIP = (request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
export const getUserSession = async (token) => {
    const supabase = supabaseClient;
    const session = await supabase.auth.getUser(token);
    if (session.error) {
        return null;
    }
    return session.data.user;
};
export const calculateFinalAmount = (amount, selectedEarnings) => {
    if (selectedEarnings === "PACKAGE") {
        const fee = amount * 0.1;
        return amount - fee;
    }
    else if (selectedEarnings === "REFERRAL") {
        const fee = amount * 0.1;
        return amount - fee;
    }
    return amount;
};
export const calculateFee = (amount, selectedEarnings) => {
    if (selectedEarnings === "PACKAGE") {
        const fee = amount * 0.1;
        return fee;
    }
    else if (selectedEarnings === "REFERRAL") {
        const fee = amount * 0.1;
        return fee;
    }
    return 0;
};
export const getPhilippinesTime = (date, time) => {
    const philippinesOffset = 8 * 60 * 60 * 1000;
    const adjustedDate = new Date(date.getTime() + philippinesOffset);
    if (time === "start") {
        adjustedDate.setUTCHours(0, 0, 0, 0);
    }
    else {
        adjustedDate.setUTCHours(23, 59, 59, 999);
    }
    const resultDate = new Date(adjustedDate.getTime() - philippinesOffset);
    return resultDate.toISOString();
};
export const generateBonus = (amount) => {
    let bonus = 0;
    if (amount < 300) {
        return bonus;
    }
    bonus = amount * 0.1;
    return bonus;
};
