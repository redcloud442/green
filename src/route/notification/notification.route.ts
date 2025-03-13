import { Hono } from "hono";
import {
  notificationGetController,
  notificationPostController,
  notificationPostPackageController,
  notificatioPutController,
} from "./notification.controller.js";
import {
  notificationGetMiddleware,
  notificationPostMiddleware,
  notificationPostPackageMiddleware,
  notificationPutMiddleware,
  notificationPutNotificationMiddleware,
} from "./notification.middleware.js";

const notification = new Hono();

notification.post("/", notificationGetMiddleware, notificationGetController);

notification.put(
  "/",
  notificationPutNotificationMiddleware,
  notificatioPutController
);

notification.post(
  "/package",
  notificationPostPackageMiddleware,
  notificationPostPackageController
);

notification.post(
  "/batch",
  notificationPostMiddleware,
  notificationPostController
);

notification.put(
  "/batch    ",
  notificationPutMiddleware,
  notificationPostController
);

export default notification;
