import { Hono } from "hono";
import { notificationPostController } from "./notification.controller.js";
import { notificationPostMiddleware, notificationPutMiddleware, } from "./notification.middleware.js";
const notification = new Hono();
notification.post("/batch", notificationPostMiddleware, notificationPostController);
notification.put("/batch    ", notificationPutMiddleware, notificationPostController);
export default notification;
