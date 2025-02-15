import type { Context } from "hono";
import { getMissions } from "./mission.model.js";

export const missionController = async (c: Context) => {
  try {
    const { allianceMemberId } = await c.req.json();

    const mission = await getMissions({ allianceMemberId });

    return c.json(mission);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
