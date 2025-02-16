import { Hono } from "hono";
import {
  missionController,
  missionPostController,
} from "./mission.controller.js";
import {
  missionMiddleware,
  missionPostMiddleware,
} from "./mission.middleware.js";

const mission = new Hono();

mission.get("/", missionMiddleware, missionController);

mission.post("/", missionPostMiddleware, missionPostController);

export default mission;
