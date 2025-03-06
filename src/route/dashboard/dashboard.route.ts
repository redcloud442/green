import { Hono } from "hono";
import {
  dashboardGetController,
  dashboardPostClientController,
  dashboardPostController,
} from "./dashboard.controller.js";
import {
  dashboardGetMiddleware,
  dashboardPostClientMiddleware,
  dashboardPostMiddleware,
} from "./dashboard.middleware.js";

const dashboard = new Hono();

dashboard.post("/", dashboardPostMiddleware, dashboardPostController);

dashboard.get("/", dashboardGetMiddleware, dashboardGetController);

dashboard.post(
  "/client",
  dashboardPostClientMiddleware,
  dashboardPostClientController
);

export default dashboard;
