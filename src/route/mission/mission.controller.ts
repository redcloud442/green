import type { Context } from "hono";
import { getMissions } from "./mission.model.js";

export const missionController = async (c: Context) => {
  try {
    const { teamMemberProfile } = c.get("teamMemberProfile");

    const mission = await getMissions({ teamMemberProfile });

    return c.json(mission);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
