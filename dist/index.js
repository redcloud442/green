import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import { protectionMiddleware } from "./middleware/protection.middleware.js";
import route from "./route/route.js";
import { redisPublisher, redisSubscriber } from "./utils/redis.js";
const app = new Hono();
app.use("*", supabaseMiddleware(), cors({
    origin: process.env.NODE_ENV === "development"
        ? ["http://localhost:3000"]
        : ["https://elevateglobal.app"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
}));
const { upgradeWebSocket, websocket } = createBunWebSocket();
app.get("/", (c) => {
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Status</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .status { font-size: 20px; color: green; }
        </style>
    </head>
    <body>
        <h1>API Status</h1>
        <p class="status">✅ API is working perfectly!</p>
        <p>Current Time: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);
});
app.onError(errorHandlerMiddleware);
app.use(logger());
app.route("/api/v1", route);
/**
 * WebSocket connections map (per replica)
 * Stores active WebSocket clients in memory.
 */
const clients = new Map();
/**
 * 🔥 Listen for Redis messages and broadcast them to all WebSocket clients
 * ✅ Ensures messages from `package-purchased` are sent to WebSockets across all replicas
 */
async function listenForRedisMessages() {
    try {
        await redisSubscriber.subscribe("package-purchased");
        console.log("✅ Subscribed to Redis channel: package-purchased");
        redisSubscriber.on("message", async (channel, message) => {
            if (channel === "package-purchased") {
                // Forward the message to all connected WebSockets in this replica
                for (const sockets of clients.values()) {
                    for (const ws of sockets) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ event: "package-purchased", data: message }));
                        }
                    }
                }
            }
        });
    }
    catch (err) {
        console.error("❌ Error subscribing to Redis:", err);
    }
}
app.get("/ws", protectionMiddleware, 
//@ts-ignore
upgradeWebSocket((c) => {
    return {
        async onOpen(evt, ws) {
            const { id } = c.get("user");
            ws.id = id;
            // Store WebSocket in local clients map (per replica)
            if (!clients.has(id)) {
                clients.set(id, new Set());
            }
            clients.get(id)?.add(ws);
        },
        onMessage(event, ws) {
            console.log(`📨 Received WebSocket message: ${event.data}`);
            // ✅ Publish message to Redis so all replicas receive it
            redisPublisher.publish("package-purchased", event.data);
        },
        async onClose(ws) {
            if (ws.id) {
                const userId = ws.id;
                const userSockets = clients.get(userId);
                if (userSockets) {
                    userSockets.delete(ws);
                    if (userSockets.size === 0) {
                        clients.delete(userId);
                    }
                }
            }
        },
    };
}));
// ✅ Start Redis listener so all replicas receive messages
listenForRedisMessages();
export default {
    port: envConfig.PORT || 9000,
    fetch: app.fetch,
    websocket,
};
