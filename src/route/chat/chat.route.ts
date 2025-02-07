import { Hono } from "hono";
import {
  chatSessionGetController,
  chatSessionPostController,
} from "./chat.controller.js";
import {
  chatSessionGetMiddleware,
  chatSessionPostMiddleware,
} from "./chat.middleware.js";

const chat = new Hono();

chat.post("/sessions", chatSessionPostMiddleware, chatSessionPostController);

chat.put("/sessions/:id", chatSessionGetMiddleware, chatSessionGetController);

export default chat;
