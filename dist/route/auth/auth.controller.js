import { Prisma } from "@prisma/client";
import { getClientIP } from "../../utils/function.js";
import { supabaseClient } from "../../utils/supabase.js";
import { adminModel, loginGetModel, loginModel, registerUserModel, } from "./auth.model.js";
export const loginController = async (c) => {
    try {
        const ip = getClientIP(c.req.raw);
        const params = c.get("params");
        await loginModel({ ...params, ip });
        return c.json({ message: "Login successful" }, 200);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return c.json({ message: "Error occurred" }, 500);
        }
        else if (error instanceof Error) {
            return c.json({ message: error.message }, 500);
        }
        return c.json({ message: "Error occurred" }, 500);
    }
};
export const loginGetController = async (c) => {
    try {
        const userName = c.get("userName");
        if (!userName) {
            return c.json({ message: "userName query parameter is required" }, 400);
        }
        const user = await loginGetModel(userName);
        if (user) {
            return c.json({ message: "User exists" }, 400);
        }
        return c.json({ success: true }, 200);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return c.json({ message: "Error occurred" }, 500);
        }
        else if (error instanceof Error) {
            return c.json({ message: error.message }, 500);
        }
        return c.json({ message: "Error occurred" }, 500);
    }
};
export const adminController = async (c) => {
    try {
        const params = c.get("params");
        await adminModel(params);
        return c.json({ message: "Admin login successful" }, 200);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return c.json({ message: "Error occurred" }, 500);
        }
        else if (error instanceof Error) {
            return c.json({ message: error.message }, 500);
        }
        return c.json({ message: "Error occurred" }, 500);
    }
};
export const registerUserController = async (c) => {
    const params = c.get("params");
    try {
        const ip = getClientIP(c.req.raw);
        await registerUserModel({ ...params, ip });
        return c.json({ message: "User created" }, 200);
    }
    catch (error) {
        await supabaseClient.auth.admin.deleteUser(params.userId);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return c.json({ message: "Error occurred" }, 500);
        }
        else if (error instanceof Error) {
            return c.json({ message: error.message }, 500);
        }
        return c.json({ message: "Error occurred" }, 500);
    }
};
