import { Hono } from "hono";
import { missionController } from "./mission.controller.js";

const mission = new Hono();

mission.post("/", missionController);

export default mission;
