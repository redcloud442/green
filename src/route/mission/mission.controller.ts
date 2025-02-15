import type { Context } from "hono";

export const missionController = async (c: Context) => {
  try {
    const { teamMemberProfile } = c.get("params");

    const missions = await prisma.mission.findMany({
      where: {
        alliance_member_id: teamMemberProfile.alliance_member_id,
      },
    });
  } catch (error) {}
};
