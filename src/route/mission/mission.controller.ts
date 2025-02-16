import type { Context } from "hono";
import { getMissions, postMission } from "./mission.model.js";

export const missionController = async (c: Context) => {
  try {
    const { teamMemberProfile } = c.get("teamMemberProfile");

    const mission = await getMissions({ teamMemberProfile });

    return c.json(mission);
  } catch (error) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

export const missionPostController = async (c: Context) => {
  try {
    const { teamMemberProfile } = c.get("teamMemberProfile");

    const mission = await postMission({ teamMemberProfile });

    return c.json(mission, 200);
  } catch (error) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
};
