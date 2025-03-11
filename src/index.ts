import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import { protectionMiddleware } from "./middleware/protection.middleware.js";
import route from "./route/route.js";
import { cleanUpStaleClients } from "./utils/function.js";
import { redisPublisher, redisSubscriber } from "./utils/redis.js";

const app = new Hono();

app.use(
  "*",
  supabaseMiddleware(),
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? ["http://localhost:3000"]
        : ["https://elevateglobal.app"],

    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
  })
);

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

const { upgradeWebSocket, websocket } = createBunWebSocket();

async function listenForRedisMessages() {
  try {
    await redisSubscriber.subscribe("package-purchased");
    console.log("✅ Subscribed to Redis channel: package-purchased");

    redisSubscriber.on("message", async (channel, message) => {
      if (channel === "package-purchased") {
        console.log(`📢 Redis Broadcast: ${message}`);

        // ✅ Get all WebSocket clients from Redis
        const clientIds = await redisPublisher.smembers("websocket-clients");

        // ✅ Notify all registered WebSockets
        for (const clientId of clientIds) {
          await redisPublisher.publish(`ws:${clientId}`, message);
        }
      }
    });
  } catch (err) {
    console.error("❌ Error subscribing to Redis:", err);
  }
}

app.get(
  "/ws",
  protectionMiddleware,
  //@ts-ignore
  upgradeWebSocket((c) => {
    return {
      async onOpen(evt: Event, ws: WebSocket & { id?: string }) {
        const { id } = c.get("user");
        ws.id = id;

        console.log(`✅ WebSocket connected: ${id}`);

        // ✅ Register client in Redis
        await redisPublisher.sadd("websocket-clients", id);

        // ✅ Subscribe WebSocket to its Redis channel
        const userSubscriber = redisSubscriber.duplicate(); // Separate Redis connection
        await userSubscriber.subscribe(`ws:${id}`);

        userSubscriber.on("message", (channel, message) => {
          if (channel === `ws:${id}` && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ event: "package-purchased", data: message })
            );
          }
        });

        let messageQueue: string[] = [];
        let isProcessing = false;

        ws.onmessage = async (event) => {
          messageQueue.push(event.data as string);

          if (!isProcessing) {
            isProcessing = true;
            setTimeout(async () => {
              const messages = messageQueue;
              messageQueue = [];
              await redisPublisher
                .pipeline()
                .publish("package-purchased", JSON.stringify(messages))
                .exec();
              isProcessing = false;
            }, 100);
          }
        };

        ws.onclose = async () => {
          console.log(`❌ WebSocket disconnected: ${id}`);

          // ✅ Remove from Redis
          await redisPublisher.srem("websocket-clients", id);
          await userSubscriber.unsubscribe(`ws:${id}`);
          userSubscriber.quit();
        };
      },
    };
  })
);

// ✅ Start Redis listener for incoming messages
listenForRedisMessages();

// ✅ Run cleanup every 5 minutes
setInterval(cleanUpStaleClients, 300000);

export default {
  port: envConfig.PORT || 9000,
  fetch: app.fetch,
  websocket,
};
