import { Hono } from "hono";
import {
  messagingBatchPostController,
  messagingPostController,
} from "./messaging.controller.js";
import {
  messagingBatchPostMiddleware,
  messagingPostMiddleware,
} from "./messaging.middleware.js";

const messaging = new Hono();

messaging.post("/", messagingPostMiddleware, messagingPostController);

messaging.post(
  "/batch",
  messagingBatchPostMiddleware,
  messagingBatchPostController
);

export default messaging;
