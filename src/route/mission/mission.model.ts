import prisma from "@/utils/prisma.js";

export const getMissions = async (alliance_member_id: string) => {
  const missions = await prisma.alliance_mission_table.findMany({
    where: {
      alliance_mission_progress_table: {
        some: {
          alliance_member_id: alliance_member_id,
        },
      },
    },
    include: {
      tasks: {
        include: {
          task_progress: {
            where: {
              alliance_member_id: alliance_member_id,
            },
          },
        },
      },
    },
  });

  return missions;
};
