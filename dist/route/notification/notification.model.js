import prisma from "../../utils/prisma.js";
export const notificationGetModel = async (params) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const notifications = await tx.alliance_notification_table.findMany({
                where: {
                    alliance_notification_user_id: params.teamMemberId,
                },
                take: params.take ? params.take : 10,
                orderBy: {
                    alliance_notification_date_created: "desc",
                },
                skip: params.skip ? params.skip : 0,
            });
            const count = await tx.alliance_notification_table.count({
                where: {
                    alliance_notification_user_id: params.teamMemberId,
                    alliance_notification_is_read: false,
                },
            });
            return { notifications, count };
        });
        return result; // Return the result directly
    }
    catch (error) {
        throw new Error("Failed to get notification");
    }
};
export const updateNotificationModel = async (params) => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.alliance_notification_table.updateMany({
                where: {
                    alliance_notification_user_id: params.teamMemberId,
                    alliance_notification_is_read: false,
                },
                data: {
                    alliance_notification_is_read: true,
                },
            });
        });
        const notifications = await prisma.alliance_notification_table.findMany({
            where: {
                alliance_notification_user_id: params.teamMemberId,
            },
            take: params.take ? params.take : 10,
            orderBy: {
                alliance_notification_date_created: "desc",
            },
        });
        return notifications;
    }
    catch (error) {
        console.error("Error updating notifications:", error);
        throw new Error("Failed to update notifications");
    }
};
export const notificationPostModel = async (params) => {
    const { page, limit } = params;
    const currentDay = new Date().toISOString().split("T")[0];
    const packageNotification = await prisma.package_notification_logs.findMany({
        where: {
            package_notification_logs_date: {
                gte: new Date(`${currentDay}T00:00:00Z`),
                lte: new Date(`${currentDay}T23:59:59Z`),
            },
        },
    });
    if (packageNotification.length > 0) {
        throw new Error("Package notification already sent");
    }
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    // Format dates for the query
    const startOfTomorrow = new Date(`${tomorrow.toISOString().split("T")[0]}T00:00:00Z`);
    const endOfTomorrow = new Date(`${tomorrow.toISOString().split("T")[0]}T23:59:59Z`);
    const packagesWithCompletionDateTomorrow = await prisma.package_member_connection_table.findMany({
        where: {
            package_member_status: "ACTIVE",
            package_member_is_notified: false,
            package_member_completion_date: {
                gte: startOfTomorrow,
                lte: endOfTomorrow,
            },
        },
        distinct: ["package_member_member_id"],
        select: {
            package_member_member_id: true,
            package_member_connection_id: true,
        },
        skip: (page - 1) * limit,
        take: limit,
    });
    if (!packagesWithCompletionDateTomorrow.length) {
        return { userCreds: [], totalCount: 0 };
    }
    // Fetch data from alliance_member_table to get teamMemberId
    const allianceMembers = await prisma.alliance_member_table.findMany({
        where: {
            alliance_member_id: {
                in: packagesWithCompletionDateTomorrow.map((item) => item.package_member_member_id),
            },
        },
        select: {
            alliance_member_id: true,
            alliance_member_user_id: true,
        },
    });
    // Fetch user credentials from user_table
    const userCreds = await prisma.user_table.findMany({
        where: {
            user_id: {
                in: allianceMembers.map((item) => item.alliance_member_user_id),
            },
        },
        select: {
            user_email: true,
            user_active_mobile: true,
            user_username: true,
            user_id: true,
        },
    });
    // Combine data from alliance_member_table and user_table with package connections
    const result = packagesWithCompletionDateTomorrow.map((packageItem) => {
        const allianceMember = allianceMembers.find((member) => member.alliance_member_id === packageItem.package_member_member_id);
        const user = userCreds.find((user) => user.user_id === allianceMember?.alliance_member_user_id);
        return {
            user_email: user?.user_email || null,
            user_active_mobile: user?.user_active_mobile || null,
            user_username: user?.user_username || null,
            team_member_id: allianceMember?.alliance_member_id || null,
            package_connection_id: packageItem.package_member_connection_id,
        };
    });
    const totalCount = await prisma.package_member_connection_table.count({
        where: {
            package_member_status: "ACTIVE",
            package_member_is_notified: false,
            package_member_completion_date: {
                gte: startOfTomorrow,
                lte: endOfTomorrow,
            },
        },
    });
    return { userCreds: result, totalCount };
};
export const notificationPutModel = async (params) => {
    const { batchData } = params;
    prisma.$transaction(async (tx) => {
        await tx.package_member_connection_table.updateMany({
            where: {
                package_member_connection_id: {
                    in: batchData.map((item) => item.packageConnectionId),
                },
            },
            data: { package_member_is_notified: true },
        });
        await tx.alliance_notification_table.createMany({
            data: batchData.map((item) => ({
                alliance_notification_user_id: item.teamMemberId,
                alliance_notification_message: "Hello, Do not forget to claim your package tomorrow !",
            })),
        });
        await tx.package_notification_logs.create({
            data: {
                package_notification_logs_date: new Date(),
            },
        });
    });
};
