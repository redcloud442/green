import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
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
export const getMissions = async (params) => {
    const { teamMemberProfile } = params;
    const allianceMemberId = teamMemberProfile.alliance_member_id;
    const cacheKey = `mission-get-${allianceMemberId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
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
                    notIn: (await prisma.alliance_mission_progress_table.findMany({
                        where: { alliance_member_id: allianceMemberId },
                        select: { alliance_mission_id: true },
                    })).map((progress) => progress.alliance_mission_id),
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
                await Promise.all(missionProgress.mission.tasks.map(async (task) => {
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
                }));
            }
        }
    }
    if (missionProgress === null) {
        return { allMissionCompleted: true };
    }
    if (!missionProgress)
        return null;
    const { mission } = missionProgress;
    const progressStartTime = missionProgress.alliance_mission_progress_created;
    const taskTypes = new Set(mission.tasks.map((task) => task.alliance_mission_task_type));
    // Prepare query promises dynamically
    const queryPromises = [];
    if (taskTypes.has("PACKAGE")) {
        queryPromises.push(prisma.package_member_connection_table.aggregate({
            where: {
                package_member_member_id: allianceMemberId,
                package_member_connection_created: { gte: progressStartTime },
            },
            _sum: { package_member_amount: true },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("WITHDRAWAL")) {
        queryPromises.push(prisma.alliance_withdrawal_request_table.count({
            where: {
                alliance_withdrawal_request_member_id: allianceMemberId,
                alliance_withdrawal_request_status: "APPROVED",
                alliance_withdrawal_request_date: { gte: progressStartTime },
            },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("DIRECT INCOME")) {
        queryPromises.push(prisma.package_ally_bounty_log.aggregate({
            where: {
                package_ally_bounty_member_id: allianceMemberId,
                package_ally_bounty_type: "DIRECT",
                package_ally_bounty_log_date_created: { gte: progressStartTime },
            },
            _sum: { package_ally_bounty_earnings: true },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("NETWORK INCOME")) {
        queryPromises.push(prisma.package_ally_bounty_log.aggregate({
            where: {
                package_ally_bounty_member_id: allianceMemberId,
                package_ally_bounty_type: "INDIRECT",
                package_ally_bounty_log_date_created: { gte: progressStartTime },
            },
            _sum: { package_ally_bounty_earnings: true },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("REINVESTMENT PACKAGE")) {
        queryPromises.push(prisma.package_member_connection_table.count({
            where: {
                package_member_member_id: allianceMemberId,
                package_member_is_reinvestment: true,
                package_member_connection_created: { gte: progressStartTime },
            },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("TOTAL INCOME")) {
        queryPromises.push(prisma.dashboard_earnings_summary.findUnique({
            where: { member_id: allianceMemberId },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("REFERRAL")) {
        queryPromises.push(prisma.package_ally_bounty_log.count({
            where: {
                package_ally_bounty_member_id: allianceMemberId,
                package_ally_bounty_type: "DIRECT",
                package_ally_bounty_log_date_created: { gte: progressStartTime },
            },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    if (taskTypes.has("BADGE")) {
        queryPromises.push(prisma.alliance_ranking_table.findUnique({
            where: { alliance_ranking_member_id: allianceMemberId },
            select: { alliance_rank: true },
        }));
    }
    else {
        queryPromises.push(Promise.resolve(null));
    }
    const [packageAmount, withdrawalCount, directBountySum, indirectBountySum, reinvestmentCount, totalIncomeData, referralCount, allianceRanking,] = await Promise.all(queryPromises);
    const totalIncome = Number(totalIncomeData?.total_earnings || 0);
    const completedTaskIds = mission.tasks
        .filter((task) => {
        const taskTarget = task.alliance_mission_task_target;
        const rankEntry = rankMapping.find((r) => r.index >= taskTarget);
        const requiredRank = rankEntry?.rank ?? null;
        const userRankIndex = rankMapping.findIndex((r) => r.rank === allianceRanking?.alliance_rank);
        const requiredRankIndex = rankMapping.findIndex((r) => r.rank === requiredRank);
        switch (task.alliance_mission_task_type) {
            case "PACKAGE":
                return ((packageAmount?._sum?.package_member_amount ?? 0) >= taskTarget);
            case "BADGE":
                return userRankIndex >= requiredRankIndex; // User has equal or higher rank
            case "WITHDRAWAL":
                return withdrawalCount >= taskTarget;
            case "DIRECT INCOME":
                return ((directBountySum._sum.package_ally_bounty_earnings ?? 0) >=
                    taskTarget);
            case "NETWORK INCOME":
                return ((indirectBountySum._sum.package_ally_bounty_earnings ?? 0) >=
                    taskTarget);
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
        progress: task.task_progress.reduce((acc, tp) => acc + tp.progress_count, 0) || 0,
    }));
    if (completedTaskIds.length > 0) {
        await Promise.all(completedTaskIds.map(async (taskId) => {
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
        }));
    }
    const updatedTasks = mission.tasks.map((task) => {
        const requiredRankEntry = rankMapping.find((r) => r.index === task.alliance_mission_task_target);
        const requiredRank = requiredRankEntry?.rank ?? null;
        const hasRequiredRank = requiredRank !== null && allianceRanking?.alliance_rank >= requiredRank;
        const userRankIndex = rankMapping.findIndex((r) => r.rank === allianceRanking?.alliance_rank);
        const requiredRankIndex = rankMapping.findIndex((r) => r.rank === requiredRank);
        const taskProgress = task.alliance_mission_task_type === "PACKAGE"
            ? packageAmount?._sum?.package_member_amount ?? 0
            : task.alliance_mission_task_type === "BADGE"
                ? userRankIndex >= requiredRankIndex
                    ? 1
                    : 0
                : task.alliance_mission_task_type === "WITHDRAWAL"
                    ? withdrawalCount
                    : task.alliance_mission_task_type === "DIRECT INCOME"
                        ? directBountySum._sum.package_ally_bounty_earnings ?? 0
                        : task.alliance_mission_task_type === "NETWORK INCOME"
                            ? indirectBountySum._sum.package_ally_bounty_earnings ?? 0
                            : task.alliance_mission_task_type === "REINVESTMENT PACKAGE"
                                ? reinvestmentCount
                                : task.alliance_mission_task_type === "TOTAL INCOME"
                                    ? totalIncome
                                    : task.alliance_mission_task_type === "REFERRAL"
                                        ? referralCount
                                        : task.task_progress.reduce((acc, tp) => acc + tp.progress_count, 0) ||
                                            0;
        const isCompleted = completedTaskIds.some(({ taskId }) => taskId === task.alliance_mission_task_id);
        return {
            task_id: task.alliance_mission_task_id,
            task_name: task.alliance_mission_task_name,
            task_target: task.alliance_mission_task_type === "BADGE" &&
                task.alliance_mission_task_target === 1
                ? "1"
                : task.alliance_mission_task_target === 2 &&
                    task.alliance_mission_task_type === "BADGE"
                    ? "1"
                    : task.alliance_mission_task_target === 3 &&
                        task.alliance_mission_task_type === "BADGE"
                        ? "1"
                        : task.alliance_mission_task_target === 4 &&
                            task.alliance_mission_task_type === "BADGE"
                            ? "1"
                            : task.alliance_mission_task_target === 5 &&
                                task.alliance_mission_task_type === "BADGE"
                                ? "1"
                                : task.alliance_mission_task_target,
            task_type: task.alliance_mission_task_type,
            progress: task.alliance_mission_task_type === "BADGE" && hasRequiredRank
                ? 1
                : taskProgress,
            task_to_achieve: task.alliance_mission_task_type === "BADGE" &&
                task.alliance_mission_task_target === 1
                ? "iron"
                : task.alliance_mission_task_target &&
                    task.alliance_mission_task_type === "BADGE" &&
                    task.alliance_mission_task_target === 2
                    ? "bronze"
                    : task.alliance_mission_task_target &&
                        task.alliance_mission_task_type === "BADGE" &&
                        task.alliance_mission_task_target === 3
                        ? "silver"
                        : task.alliance_mission_task_target === 4 &&
                            task.alliance_mission_task_type === "BADGE"
                            ? "gold"
                            : task.alliance_mission_task_target === 5 &&
                                task.alliance_mission_task_type === "BADGE"
                                ? "platinum"
                                : task.alliance_mission_task_target,
            is_completed: isCompleted,
        };
    });
    const isMissionCompleted = updatedTasks.every((task) => task.is_completed);
    const returnData = {
        mission_id: mission.alliance_mission_id,
        mission_name: mission.alliance_mission_name,
        mission_order: mission.alliance_mission_order,
        reward: mission.alliance_mission_reward,
        tasks: updatedTasks,
        isMissionCompleted,
    };
    await redis.set(cacheKey, JSON.stringify(returnData), { ex: 100 });
    return returnData;
};
export const postMission = async (params) => {
    const { teamMemberProfile } = params;
    const allianceMemberId = teamMemberProfile.alliance_member_id;
    // Fetch the current incomplete mission progress
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
    });
    if (!missionProgress)
        return null;
    if (missionProgress.is_completed)
        return null;
    // Check if all tasks are completed
    const isMissionCompleted = missionProgress.mission.tasks.length > 0 &&
        missionProgress.mission.tasks.every((task) => task.task_progress.length > 0 &&
            task.task_progress.every((tp) => tp.is_completed));
    // If mission is completed, update progress and assign next mission
    if (isMissionCompleted) {
        await prisma.alliance_mission_progress_table.update({
            where: {
                alliance_mission_progress_id: missionProgress.alliance_mission_progress_id,
            },
            data: { is_completed: true, reward_claimed: true },
        });
        // Get already completed mission IDs
        const completedMissionIds = await prisma.alliance_mission_progress_table.findMany({
            where: { alliance_member_id: allianceMemberId },
            select: { alliance_mission_id: true },
        });
        // Find the next mission
        const nextMission = await prisma.alliance_mission_table.findFirst({
            where: {
                alliance_mission_id: {
                    notIn: completedMissionIds.map((p) => p.alliance_mission_id),
                },
            },
            orderBy: { alliance_mission_order: "asc" },
        });
        if (nextMission) {
            await prisma.alliance_mission_progress_table.create({
                data: {
                    alliance_member_id: allianceMemberId,
                    alliance_mission_id: nextMission.alliance_mission_id,
                    is_completed: false,
                    reward_claimed: false,
                },
            });
            // Fetch new mission progress
            missionProgress = await prisma.alliance_mission_progress_table.findFirst({
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
            });
        }
    }
    const allianceRanking = await prisma.alliance_ranking_table.findUnique({
        where: { alliance_ranking_member_id: allianceMemberId },
        select: { alliance_rank: true },
    });
    const requiredRankEntry = rankMapping.find((r) => r.index === missionProgress?.mission.alliance_mission_order);
    const requiredRank = requiredRankEntry?.rank ?? null;
    const hasRequiredRank = requiredRank !== null && allianceRanking?.alliance_rank === requiredRank;
    const formattedTask = missionProgress?.mission.tasks.map((task) => ({
        task_id: task.alliance_mission_task_id,
        task_name: task.alliance_mission_task_name,
        task_target: task.alliance_mission_task_type === "BADGE" &&
            task.alliance_mission_task_target === 1
            ? "1"
            : task.alliance_mission_task_target === 2 &&
                task.alliance_mission_task_type === "BADGE"
                ? "1"
                : task.alliance_mission_task_target === 3 &&
                    task.alliance_mission_task_type === "BADGE"
                    ? "1"
                    : task.alliance_mission_task_target === 4 &&
                        task.alliance_mission_task_type === "BADGE"
                        ? "1"
                        : task.alliance_mission_task_target === 5 &&
                            task.alliance_mission_task_type === "BADGE"
                            ? "1"
                            : task.alliance_mission_task_target,
        task_type: task.alliance_mission_task_type,
        task_to_achieve: task.alliance_mission_task_type === "BADGE" &&
            task.alliance_mission_task_target === 1
            ? "iron"
            : task.alliance_mission_task_target &&
                task.alliance_mission_task_type === "BADGE" &&
                task.alliance_mission_task_target === 2
                ? "bronze"
                : task.alliance_mission_task_target &&
                    task.alliance_mission_task_type === "BADGE" &&
                    task.alliance_mission_task_target === 3
                    ? "silver"
                    : task.alliance_mission_task_target === 4 &&
                        task.alliance_mission_task_type === "BADGE"
                        ? "gold"
                        : task.alliance_mission_task_target === 5 &&
                            task.alliance_mission_task_type === "BADGE"
                            ? "platinum"
                            : task.alliance_mission_task_target,
        progress: task.alliance_mission_task_type === "BADGE" && hasRequiredRank
            ? 1
            : task.task_progress.reduce((acc, tp) => acc + tp.progress_count, 0),
        is_completed: task.task_progress.every((tp) => tp.is_completed),
    }));
    const missionData = {
        mission_id: missionProgress?.mission.alliance_mission_id,
        mission_name: missionProgress?.mission.alliance_mission_name,
        mission_order: missionProgress?.mission.alliance_mission_order,
        reward: missionProgress?.mission.alliance_mission_reward,
        tasks: formattedTask,
        isMissionCompleted: false,
    };
    const lastCompletedMission = await prisma.alliance_mission_progress_table.findFirst({
        where: { alliance_member_id: allianceMemberId, is_completed: true },
        orderBy: { alliance_mission_progress_created: "desc" },
        include: { mission: true },
    });
    const packageRewardAmount = lastCompletedMission?.mission.alliance_mission_reward ?? 0;
    const packageData = await prisma.$transaction(async (tx) => {
        const findPeakPackage = await tx.package_table.findFirst({
            where: { package_name: "Package 1" },
        });
        if (!findPeakPackage)
            return null;
        const packageReward = await tx.package_member_connection_table.create({
            data: {
                package_member_member_id: allianceMemberId,
                package_member_package_id: findPeakPackage.package_id,
                package_member_amount: Number(packageRewardAmount),
                package_amount_earnings: Number(packageRewardAmount) *
                    (findPeakPackage.package_percentage / 100),
                package_member_status: "ACTIVE",
                package_member_is_reinvestment: false,
                package_member_connection_created: new Date(),
                package_member_completion_date: new Date(Date.now() + findPeakPackage.packages_days * 24 * 60 * 60 * 1000),
            },
        });
        return { ...packageReward, package_color: findPeakPackage.package_image };
    });
    return { missionData, packageData };
};
