import { getPhilippinesTime } from "@/utils/function.js";
import prisma from "@/utils/prisma.js";
import type { alliance_member_table } from "@prisma/client";

const rankMapping = [
  { index: 1, threshold: 3, rank: "iron" },
  { index: 2, threshold: 6, rank: "bronze" },
  { index: 3, threshold: 10, rank: "silver" },
  { index: 4, threshold: 20, rank: "gold" },
  { index: 5, threshold: 50, rank: "platinum" },
  { index: 6, threshold: 100, rank: "emerald" },
  { index: 7, threshold: 150, rank: "ruby" },
  { index: 8, threshold: 200, rank: "sapphire" },
  { index: 9, threshold: 500, rank: "diamond" },
];

export const getMissions = async (params: {
  teamMemberProfile: alliance_member_table;
}) => {
  const { teamMemberProfile } = params;
  const allianceMemberId = teamMemberProfile.alliance_member_id;

  let missionProgress = await prisma.alliance_mission_progress_table.findFirst({
    where: { alliance_member_id: allianceMemberId, is_completed: false },
    include: {
      mission: {
        include: {
          tasks: {
            include: {
              task_progress: {
                where: { alliance_member_id: allianceMemberId },
              },
            },
          },
        },
      },
    },
    take: 1,
  });

  if (!missionProgress) {
    const firstMission = await prisma.alliance_mission_table.findFirst({
      orderBy: { alliance_mission_order: "asc" },
      where: {
        alliance_mission_id: {
          notIn: (
            await prisma.alliance_mission_progress_table.findMany({
              where: { alliance_member_id: allianceMemberId },
              select: { alliance_mission_id: true },
            })
          ).map((progress) => progress.alliance_mission_id),
        },
      },
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
              tasks: true,
            },
          },
        },
      });

      if (missionProgress) {
        await Promise.all(
          missionProgress.mission.tasks.map(async (task) => {
            await prisma.alliance_mission_task_progress_table.upsert({
              where: {
                alliance_member_id_alliance_mission_task_id: {
                  alliance_member_id: allianceMemberId,
                  alliance_mission_task_id: task.alliance_mission_task_id,
                },
              },
              update: {},
              create: {
                alliance_member_id: allianceMemberId,
                alliance_mission_task_id: task.alliance_mission_task_id,
                progress_count: 0,
                is_completed: false,
              },
            });
          })
        );
      }
    }
  }

  if (!missionProgress) return null;

  const { mission } = missionProgress;
  const progressStartTime = getPhilippinesTime(
    missionProgress.alliance_mission_progress_created,
    "start"
  );

  const [
    packageAmount,
    withdrawalCount,
    directIncomeCount,
    networkIncomeCount,
    reinvestmentCount,
    totalIncomeData,
    referralCount,
  ] = await Promise.all([
    prisma.package_member_connection_table.aggregate({
      where: {
        package_member_member_id: allianceMemberId,
        package_member_connection_created: { gte: progressStartTime },
      },
      _sum: { package_member_amount: true },
    }),
    prisma.alliance_withdrawal_request_table.count({
      where: {
        alliance_withdrawal_request_member_id: allianceMemberId,
        alliance_withdrawal_request_date: { gte: progressStartTime },
      },
    }),
    prisma.package_ally_bounty_log.count({
      where: {
        package_ally_bounty_member_id: allianceMemberId,
        package_ally_bounty_type: "DIRECT",
        package_ally_bounty_log_date_created: { gte: progressStartTime },
      },
    }),
    prisma.package_ally_bounty_log.count({
      where: {
        package_ally_bounty_member_id: allianceMemberId,
        package_ally_bounty_type: "INDIRECT",
        package_ally_bounty_log_date_created: { gte: progressStartTime },
      },
    }),
    prisma.package_member_connection_table.count({
      where: {
        package_member_member_id: allianceMemberId,
        package_member_is_reinvestment: true,
        package_member_connection_created: { gte: progressStartTime },
      },
    }),
    prisma.dashboard_earnings_summary.findUnique({
      where: { member_id: allianceMemberId },
    }),
    prisma.package_ally_bounty_log.count({
      where: {
        package_ally_bounty_member_id: allianceMemberId,
        package_ally_bounty_type: "DIRECT",
        package_ally_bounty_log_date_created: { gte: progressStartTime },
      },
    }),
  ]);

  const totalIncome = Number(totalIncomeData?.total_earnings || 0);

  const completedTaskIds = mission.tasks
    .filter((task) => {
      const taskTarget = task.alliance_mission_task_target;
      switch (task.alliance_mission_task_type) {
        case "PACKAGE":
          return (
            (packageAmount?._sum?.package_member_amount ?? 0) >= taskTarget
          );
        case "BADGE":
          return rankMapping.some((r) => r.index >= taskTarget);
        case "WITHDRAWAL":
          return withdrawalCount >= taskTarget;
        case "DIRECT INCOME":
          return directIncomeCount >= taskTarget;
        case "NETWORK INCOME":
          return networkIncomeCount >= taskTarget;
        case "REINVESTMENT PACKAGE":
          return reinvestmentCount >= taskTarget;
        case "TOTAL INCOME":
          return totalIncome >= taskTarget;
        case "REFERRAL":
          return referralCount >= taskTarget;
        default:
          return false;
      }
    })
    .map((task) => ({
      taskId: task.alliance_mission_task_id,
      progress:
        task.task_progress.reduce((acc, tp) => acc + tp.progress_count, 0) || 0,
    }));

  if (completedTaskIds.length > 0) {
    await Promise.all(
      completedTaskIds.map(async (taskId) => {
        await prisma.alliance_mission_task_progress_table.upsert({
          where: {
            alliance_member_id_alliance_mission_task_id: {
              alliance_member_id: allianceMemberId,
              alliance_mission_task_id: taskId.taskId,
            },
          },
          update: { is_completed: true, completed_at: new Date() },
          create: {
            alliance_member_id: allianceMemberId,
            alliance_mission_task_id: taskId.taskId,
            progress_count: taskId.progress,
            is_completed: true,
            completed_at: new Date(),
          },
        });
      })
    );
  }

  const updatedTasks = mission.tasks.map((task) => {
    const taskProgress =
      task.alliance_mission_task_type === "PACKAGE"
        ? packageAmount?._sum?.package_member_amount ?? 0
        : task.alliance_mission_task_type === "BADGE"
        ? rankMapping.find((r) => r.index >= task.alliance_mission_task_target)
            ?.rank
        : task.alliance_mission_task_type === "WITHDRAWAL"
        ? withdrawalCount
        : task.alliance_mission_task_type === "DIRECT INCOME"
        ? directIncomeCount
        : task.alliance_mission_task_type === "NETWORK INCOME"
        ? networkIncomeCount
        : task.alliance_mission_task_type === "REINVESTMENT PACKAGE"
        ? reinvestmentCount
        : task.alliance_mission_task_type === "TOTAL INCOME"
        ? totalIncome
        : task.alliance_mission_task_type === "REFERRAL"
        ? referralCount
        : task.task_progress.reduce((acc, tp) => acc + tp.progress_count, 0) ||
          0;

    const isCompleted = completedTaskIds.some(
      ({ taskId }) => taskId === task.alliance_mission_task_id
    );
    return {
      task_id: task.alliance_mission_task_id,
      task_name: task.alliance_mission_task_name,
      task_target:
        task.alliance_mission_task_type === "BADGE" &&
        task.alliance_mission_task_target === 1
          ? "iron"
          : task.alliance_mission_task_target,
      task_type: task.alliance_mission_task_type,
      progress: taskProgress,
      task_to_achieve:
        task.alliance_mission_task_type === "BADGE" &&
        task.alliance_mission_task_target === 1
          ? "iron"
          : task.alliance_mission_task_target &&
            task.alliance_mission_task_type === "BADGE" &&
            task.alliance_mission_task_target === 2
          ? "bronze"
          : task.alliance_mission_task_target,
      is_completed: isCompleted,
    };
  });

  const isMissionCompleted = updatedTasks.every((task) => task.is_completed);

  // if (isMissionCompleted) {
  //   await prisma.alliance_mission_progress_table.update({
  //     where: {
  //       alliance_mission_progress_id:
  //         missionProgress.alliance_mission_progress_id,
  //     },
  //     data: { is_completed: true },
  //   });
  // }

  return {
    mission_id: mission.alliance_mission_id,
    mission_name: mission.alliance_mission_name,
    mission_order: mission.alliance_mission_order,
    reward: mission.alliance_mission_reward,
    tasks: updatedTasks,
    isMissionCompleted,
  };
};
