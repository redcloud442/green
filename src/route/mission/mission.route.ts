import { Hono } from "hono";
import { missionController } from "./mission.controller.js";
import { missionMiddleware } from "./mission.middleware.js";

const mission = new Hono();

mission.get("/", missionMiddleware, missionController);

export default mission;
