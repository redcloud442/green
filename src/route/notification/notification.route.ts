import { Hono } from "hono";
import {
  notificationControlController,
  notificationGetController,
  notificationGetPackageController,
  notificationPostController,
  notificationPostPackageController,
  notificatioPutController,
} from "./notification.controller.js";
import {
  notificationControlMiddleware,
  notificationGetMiddleware,
  notificationGetPackageMiddleware,
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

notification.put(
  "/package/control",
  notificationControlMiddleware,
  notificationControlController
);

notification.get(
  "/package/control",
  notificationGetPackageMiddleware,
  notificationGetPackageController
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
