import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Server } from "socket.io";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import route from "./route/route.js";
import { initializeSocketFunctions } from "./socket/socket.js";

const app = new Hono();

app.use(
  "*",
  supabaseMiddleware(),
  cors({
    origin: [
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://elevateglobal.app",
    ],

    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
  })
);

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

const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? "https://elevateglobal.app"
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initializeSocketFunctions(io);

export { io };

console.log(`Server is running on port ${envConfig.PORT}`);
