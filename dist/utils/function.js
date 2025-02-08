import { supabaseClient } from "./supabase.js";
export const sendErrorResponse = (message, status) => Response.json({ error: message }, { status });
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
    // Set the hours, minutes, and seconds based on the start or end of the day
    if (time === "start") {
        date.setUTCHours(0, 0, 0, 0);
    }
    else {
        date.setUTCHours(23, 59, 59, 999);
    }
    // Convert to ISO string and replace 'Z' with the correct offset for Manila
    const isoString = date.toISOString().replace("Z", "+08:00");
    return isoString;
};
