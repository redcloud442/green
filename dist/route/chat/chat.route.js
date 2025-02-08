import { Hono } from "hono";
import { chatRequestSessionController, chatSessionGetController, chatSessionGetMessageController, chatSessionPostController, } from "./chat.controller.js";
import { chatRequestSessionMiddleware, chatSessionGetMessageMiddleware, chatSessionGetMiddleware, chatSessionPostMiddleware, } from "./chat.middleware.js";
const chat = new Hono();
chat.post("/sessions", chatSessionPostMiddleware, chatSessionPostController);
chat.post("/", chatRequestSessionMiddleware, chatRequestSessionController);
chat.get("/", chatSessionGetMessageMiddleware, chatSessionGetMessageController);
chat.put("/sessions/:id", chatSessionGetMiddleware, chatSessionGetController);
export default chat;
