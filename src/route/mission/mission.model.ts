import prisma from "@/utils/prisma.js";

export const getMissions = async (params: { allianceMemberId: string }) => {
  const { allianceMemberId } = params;

  // Find the current active mission where tasks are incomplete
  let missionProgress = await prisma.alliance_mission_progress_table.findFirst({
    where: {
      alliance_member_id: allianceMemberId,
      is_completed: false,
    },
    include: {
      mission: {
        include: {
          tasks: {
            include: {
              task_progress: {
                where: {
                  alliance_member_id: allianceMemberId,
                  is_completed: false, // Only fetch incomplete tasks
                },
              },
            },
          },
        },
      },
    },
  });

  // If no active mission, assign the user to the first mission
  if (!missionProgress) {
    const firstMission = await prisma.alliance_mission_table.findFirst({
      orderBy: { alliance_mission_order: "asc" },
      take: 1,
    });

    if (firstMission) {
      missionProgress = await prisma.alliance_mission_progress_table.create({
        data: {
          alliance_member_id: allianceMemberId,
          alliance_mission_id: firstMission.alliance_mission_id,
          is_completed: false,
          reward_claimed: false,
        },
        include: {
          mission: {
            include: {
              tasks: {
                include: {
                  task_progress: {
                    where: {
                      alliance_member_id: allianceMemberId,
                      is_completed: false,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
  }

  // If still null, return an empty response
  if (!missionProgress) return null;

  const { mission } = missionProgress;

  // 🚀 Dynamic Task Checker
  for (const task of mission.tasks) {
    const taskProgress = task.task_progress[0] || { progress_count: 0 };

    if (!taskProgress.is_completed) {
      if (task.alliance_mission_task_type === "PACKAGE") {
        const packageAmount =
          await prisma.package_member_connection_table.aggregate({
            where: { package_member_member_id: allianceMemberId },
            _sum: { package_member_amount: true },
          });

        if (
          (packageAmount?._sum?.package_member_amount ?? 0) >=
          task.alliance_mission_task_target
        ) {
          await prisma.alliance_mission_task_progress_table.updateMany({
            where: { alliance_mission_task_id: task.alliance_mission_task_id },
            data: { is_completed: true },
          });
        }
      }

      if (task.alliance_mission_task_type === "BADGE") {
        const allianceRanking = await prisma.alliance_ranking_table.findUnique({
          where: { alliance_ranking_member_id: allianceMemberId },
        });

        if (allianceRanking?.alliance_rank) {
          await prisma.alliance_mission_task_progress_table.updateMany({
            where: { alliance_mission_task_id: task.alliance_mission_task_id },
            data: { is_completed: true },
          });
        }
      }

      if (
        task.alliance_mission_task_type === "WITHDRAWAL" &&
        task.alliance_mission_task_target > 0
      ) {
        const withdrawalCount =
          await prisma.alliance_withdrawal_request_table.count({
            where: { alliance_withdrawal_request_member_id: allianceMemberId },
          });

        if (withdrawalCount >= task.alliance_mission_task_target) {
          await prisma.alliance_mission_task_progress_table.updateMany({
            where: { alliance_mission_task_id: task.alliance_mission_task_id },
            data: { is_completed: true },
          });
        }
      }

      if (
        task.alliance_mission_task_type === "REFERRAL" &&
        task.alliance_mission_task_target > 0
      ) {
        const referralCount = await prisma.package_ally_bounty_log.count({
          where: {
            package_ally_bounty_member_id: allianceMemberId,
            package_ally_bounty_type: "DIRECT",
          },
        });

        if (referralCount >= task.alliance_mission_task_target) {
          await prisma.alliance_mission_task_progress_table.updateMany({
            where: { alliance_mission_task_id: task.alliance_mission_task_id },
            data: { is_completed: true },
          });
        }
      }
    }
  }

  // Fetch only tasks that are still incomplete
  const updatedTasks = mission.tasks
    .map((task) => {
      const taskProgress = task.task_progress[0] || { progress_count: 0 };
      return {
        task_id: task.alliance_mission_task_id,
        task_name: task.alliance_mission_task_name,
        task_target: task.alliance_mission_task_target,
        task_type: task.alliance_mission_task_type,
        progress: taskProgress.is_completed
          ? task.alliance_mission_task_target
          : 0,
        is_completed: taskProgress.is_completed,
      };
    })
    .filter((task) => !task.is_completed); // Remove completed tasks

  const isMissionCompleted = updatedTasks.length === 0;

  if (isMissionCompleted) {
    await prisma.alliance_mission_progress_table.update({
      where: {
        alliance_mission_progress_id:
          missionProgress.alliance_mission_progress_id,
      },
      data: { is_completed: true },
    });
  }

  return {
    mission_id: mission.alliance_mission_id,
    mission_name: mission.alliance_mission_name,
    mission_order: mission.alliance_mission_order,
    reward: mission.alliance_mission_reward,
    tasks: updatedTasks,
    isMissionCompleted,
  };
};
