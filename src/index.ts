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
const clients = new Set<WebSocket>();

async function listenForRedisMessages() {
  while (true) {
    try {
      const message = await redis.rpop("websocket-channel");
      console.log(message);
      if (message) {
        console.log("test");
        try {
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(message));
            }
          }
        } catch (err) {}
      }
    } catch (error) {}
  }
}

app.get(
  "/ws",
  protectionMiddleware,
  //@ts-ignore
  upgradeWebSocket(() => {
    return {
      onOpen(evt: Event, ws: WebSocket) {
        clients.add(ws);
      },
      onMessage(event, ws) {
        redis.lpush("websocket-channel", event.data).then(() => {
          listenForRedisMessages();
        });
      },
      onClose(ws: WebSocket) {
        clients.delete(ws);
      },
    };
  })
);

listenForRedisMessages();

export default {
  port: envConfig.PORT || 9000,
  fetch: app.fetch,
  websocket,
};
