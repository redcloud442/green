import { Hono } from "hono";
import { notificationGetController, notificationPostController, notificatioPutController, } from "./notification.controller.js";
import { notificationGetMiddleware, notificationPostMiddleware, notificationPutMiddleware, notificationPutNotificationMiddleware, } from "./notification.middleware.js";
const notification = new Hono();
notification.post("/", notificationGetMiddleware, notificationGetController);
notification.put("/", notificationPutNotificationMiddleware, notificatioPutController);
notification.post("/batch", notificationPostMiddleware, notificationPostController);
notification.put("/batch    ", notificationPutMiddleware, notificationPostController);
export default notification;
