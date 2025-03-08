import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import { protectionMiddleware } from "./middleware/protection.middleware.js";
import route from "./route/route.js";
import { redis } from "./utils/redis.js";

const app = new Hono();

app.use(
  "*",
  supabaseMiddleware(),
  cors({
    origin: [
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000, http://192.168.1.56:3000"
        : "https://elevateglobal.app",
    ],

    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
  })
);

const { upgradeWebSocket, websocket } = createBunWebSocket();

(async () => {
  const isAuthenticated = await redis.authenticate();
  if (isAuthenticated) {
    console.log("✅ Redis Authentication Successful!");
  } else {
    console.error("❌ Redis Authentication Failed!");
    process.exit(1);
  }
})();

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Status</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          .status {
            font-size: 20px;
            color: green;
          }
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

const clients = new Map<string, Set<WebSocket>>();

// async function listenForRedisMessages() {
//   try {
//     await redisSubscriber.subscribe("package-purchased");
//     console.log("✅ Redis subscribed to package-purchased");

//     redisSubscriber.on("message", async (channel, message) => {
//       if (channel === "package-purchased") {
//         const clientIds = await redis.smembers("websocket-clients");

//         console.log("Clients to notify:", clientIds);

//         for (const clientId of clientIds) {
//           const userSockets = clients.get(clientId);

//           if (userSockets) {
//             console.log(
//               `Sending message to ${clientId}, ${userSockets.size} connections`
//             );
//             for (const ws of userSockets) {
//               if (ws.readyState === WebSocket.OPEN) {
//                 ws.send(
//                   JSON.stringify({ event: "package-purchased", data: message })
//                 );
//               }
//             }
//           }
//         }
//       }
//     });
//   } catch (err) {
//     console.error("❌ Error subscribing to Redis:", err);
//   }
// }

app.get(
  "/ws",
  protectionMiddleware,
  //@ts-ignore
  upgradeWebSocket((c) => {
    return {
      async onOpen(evt: Event, ws: WebSocket & { id?: string }) {
        const { id } = c.get("user");
        if (!clients.has(id)) {
          clients.set(id, new Set([ws]));
        } else {
          clients.get(id)!.add(ws); // Add the WebSocket to the user's connection set
        }

        await redis.sadd("websocket-clients", id);

        console.log(
          `Client ${id} connected. Total connections: ${clients.get(id)?.size}`
        );
      },

      onMessage(event, ws) {
        ws.send(event.data as string);
      },

      onClose(ws: WebSocket & { id?: string }) {
        if (ws.id) {
          const userId = ws.id;
          const userSockets = clients.get(userId);

          if (userSockets) {
            userSockets.delete(ws);
            console.log(
              `Client ${userId} disconnected. Remaining connections: ${userSockets.size}`
            );

            if (userSockets.size === 0) {
              redis.srem("websocket-clients", userId);
              clients.delete(userId);
            }
          }
        }
      },
    };
  })
);

// listenForRedisMessages();

export default {
  port: envConfig.PORT || 9000,
  fetch: app.fetch,
  websocket,
};
