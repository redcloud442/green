import { serve } from "@hono/node-server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Server as SocketIoServer } from "socket.io";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import { chatSessionPostModel, chatSessionPostModelAdmin, } from "./route/chat/chat.model.js";
import route from "./route/route.js";
import prisma from "./utils/prisma.js";
const app = new Hono();
app.use("*", supabaseMiddleware(), cors({
    origin: [
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : "https://elevateglobal.app",
    ],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
}));
app.get("/", (c) => {
    return c.text("API endpoint is working!");
});
app.onError(errorHandlerMiddleware);
app.use(logger());
app.route("/api/v1", route);
const server = serve({
    fetch: app.fetch,
    port: envConfig.PORT,
});
const io = new SocketIoServer(server);
io.use((socket, next) => {
    const authCookies = parseCookieHeader(socket.request.headers.cookie || "");
    const supabase = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return authCookies;
            },
        },
    });
    supabase.auth.getUser().then(async ({ data }) => {
        socket.data.user = data.user;
        const teamMemberProfile = await prisma.alliance_member_table.findFirst({
            where: {
                alliance_member_user_id: socket.data.user?.id,
            },
        });
        socket.data.teamMemberProfile = teamMemberProfile;
        next();
    });
});
io.on("connection", async (socket) => {
    socket.on("requestSupportSession", async (sessionId, teamId) => {
        socket.join(sessionId);
        io.to(socket.id).emit("waitingForAdmin", {
            message: "Waiting for an admin to accept your session...",
        });
        const data = await chatSessionPostModelAdmin();
        if (data) {
            io.to(`${teamId}-chat-support-admin`).emit("newQueueSession", data);
        }
    });
    socket.on("acceptSupportSession", ({ sessionId }) => {
        const teamMemberProfile = socket.data.teamMemberProfile;
        if (teamMemberProfile?.alliance_member_role !== "ADMIN") {
            return;
        }
        io.to(sessionId).emit("supportSessionAccepted", { sessionId });
    });
    socket.on("joinRoom", async ({ roomId }) => {
        const teamMemberProfile = socket.data.teamMemberProfile;
        if (teamMemberProfile?.alliance_member_role === "ADMIN") {
            const existingMessages = await prisma.chat_message_table.findMany({
                where: { chat_message_session_id: roomId },
                orderBy: { chat_message_date: "asc" },
            });
            if (existingMessages.length === 0) {
                await prisma.chat_message_table.create({
                    data: {
                        chat_message_content: "Welcome to the support chat! How can I help you today?",
                        chat_message_session_id: roomId,
                        chat_message_alliance_member_id: teamMemberProfile?.alliance_member_id,
                        chat_message_date: new Date().toISOString(),
                        chat_message_sender_user: "Chat Support", // Pass the correct value here
                    },
                });
            }
        }
        const messages = await prisma.chat_message_table.findMany({
            where: {
                chat_message_session_id: roomId,
            },
            orderBy: {
                chat_message_date: "asc",
            },
        });
        socket.emit("messages", messages);
        socket.join(roomId);
    });
    socket.on("sendMessage", async (message) => {
        await prisma.chat_message_table.create({ data: { ...message } });
        io.to(message.chat_message_session_id).emit("newMessage", message);
    });
    socket.on("joinWaitingRoom", (roomName) => {
        socket.join(`${roomName}-chat-support-admin`);
    });
    socket.on("fetchWaitingList", async (page, limit, roomName) => {
        const teamMemberProfile = socket.data.teamMemberProfile;
        if (teamMemberProfile?.alliance_member_role !== "ADMIN") {
            return;
        }
        const data = await chatSessionPostModel({ page, limit });
        io.to(`${roomName}-chat-support-admin`).emit("waitingList", data);
    });
    socket.on("endSupport", async (sessionId, userName) => {
        await prisma.chat_session_table.update({
            where: { chat_session_id: sessionId },
            data: { chat_session_status: "SUPPORT ENDED" },
        });
        let messages;
        messages = await prisma.chat_message_table.create({
            data: {
                chat_message_content: "Support session ended",
                chat_message_session_id: sessionId,
                chat_message_alliance_member_id: socket.data.teamMemberProfile?.alliance_member_id,
                chat_message_date: new Date().toISOString(),
                chat_message_sender_user: "Chat Support",
            },
        });
        io.to(sessionId).emit("endSupport", { sessionId, messages });
    });
    socket.on("disconnect", () => { });
});
export default io;
console.log(`Server is running on port ${envConfig.PORT}`);
