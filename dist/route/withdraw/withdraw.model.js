import { Prisma } from "@prisma/client";
import { calculateFee, calculateFinalAmount, getPhilippinesTime, } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
export const withdrawModel = async (params) => {
    const { earnings, accountNumber, accountName, amount, bank, teamMemberProfile, } = params;
    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${today}T00:00:00Z`);
    const endDate = new Date(`${today}T23:59:59Z`);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    // Check for "PACKAGE" withdrawals
    const existingPackageWithdrawal = await prisma.alliance_withdrawal_request_table.findFirst({
        where: {
            alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
            alliance_withdrawal_request_status: {
                in: ["PENDING", "APPROVED"],
            },
            alliance_withdrawal_request_withdraw_type: earnings,
            alliance_withdrawal_request_date: {
                gte: todayStart, // Start of the day
                lte: todayEnd, // End of the day
            },
        },
    });
    if (existingPackageWithdrawal) {
        throw new Error("You have already made a PACKAGE withdrawal today. Please try again tomorrow.");
    }
    const amountMatch = await prisma.alliance_earnings_table.findUnique({
        where: {
            alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
        },
        select: {
            alliance_olympus_earnings: true,
            alliance_referral_bounty: true,
            alliance_combined_earnings: true,
        },
    });
    if (!amountMatch || !teamMemberProfile?.alliance_member_is_active) {
        throw new Error("Invalid request.");
    }
    const { alliance_olympus_earnings, alliance_referral_bounty } = amountMatch;
    const amountValue = Math.round(Number(amount) * 100) / 100;
    const earningsType = earnings === "PACKAGE"
        ? "alliance_olympus_earnings"
        : "alliance_referral_bounty";
    const earningsWithdrawalType = earnings === "PACKAGE"
        ? "alliance_withdrawal_request_earnings_amount"
        : "alliance_withdrawal_request_referral_amount";
    const earningsValue = Math.round(Number(earningsType) * 100) / 100;
    if (amountValue > earningsValue) {
        throw new Error("Insufficient balance.");
    }
    let remainingAmount = Number(amount);
    if (earnings === "PACKAGE") {
        const olympusDeduction = Math.min(remainingAmount, Number(alliance_olympus_earnings));
        remainingAmount -= olympusDeduction;
    }
    if (earnings === "REFERRAL") {
        const referralDeduction = Math.min(remainingAmount, Number(alliance_referral_bounty));
        remainingAmount -= referralDeduction;
    }
    if (remainingAmount > 0) {
        throw new Error("Invalid request.");
    }
    const finalAmount = calculateFinalAmount(Number(amount), earnings);
    const fee = calculateFee(Number(amount), earnings);
    await prisma.$transaction(async (tx) => {
        const countAllRequests = await tx.$queryRaw `
      SELECT am.alliance_member_id AS "approverId",
             COALESCE(approvedRequests."requestCount", 0) AS "requestCount"
      FROM alliance_schema.alliance_member_table am
      LEFT JOIN (
        SELECT awr.alliance_withdrawal_request_approved_by AS "approverId",
               COUNT(awr.alliance_withdrawal_request_id) AS "requestCount"
        FROM alliance_schema.alliance_withdrawal_request_table awr
        WHERE awr.alliance_withdrawal_request_date BETWEEN ${startDate} AND ${endDate}
        GROUP BY awr.alliance_withdrawal_request_approved_by
      ) approvedRequests ON am.alliance_member_id = approvedRequests."approverId"
      WHERE am.alliance_member_role = 'ACCOUNTING'
      ORDER BY "requestCount" ASC
      LIMIT 1;
    `;
        await tx.alliance_withdrawal_request_table.create({
            data: {
                alliance_withdrawal_request_amount: Number(amount),
                alliance_withdrawal_request_type: bank,
                alliance_withdrawal_request_account: accountNumber,
                alliance_withdrawal_request_fee: fee,
                alliance_withdrawal_request_withdraw_amount: finalAmount,
                alliance_withdrawal_request_bank_name: accountName,
                alliance_withdrawal_request_status: "PENDING",
                [earningsWithdrawalType]: finalAmount,
                alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
                alliance_withdrawal_request_withdraw_type: earnings,
                alliance_withdrawal_request_approved_by: countAllRequests[0]?.approverId ?? null,
            },
        });
        // Update the earnings
        // Update the earnings
        await tx.alliance_earnings_table.update({
            where: {
                alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
            },
            data: {
                [earningsType]: {
                    decrement: Number(amount),
                },
                alliance_combined_earnings: {
                    decrement: Number(amount),
                },
            },
        }),
            // Log the transaction
            await prisma.alliance_transaction_table.create({
                data: {
                    transaction_amount: calculateFinalAmount(Number(amount), earnings),
                    transaction_description: "Withdrawal Ongoing",
                    transaction_member_id: teamMemberProfile.alliance_member_id,
                },
            }),
            await prisma.alliance_notification_table.create({
                data: {
                    alliance_notification_user_id: teamMemberProfile.alliance_member_id,
                    alliance_notification_message: `Withdrawal request is Ongoing amounting to ₱ ${Math.floor(calculateFinalAmount(Number(amount), earnings)).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}. Please wait for approval.`,
                },
            });
    });
};
export const withdrawHistoryModel = async (params, teamMemberProfile) => {
    const { page, limit, search, columnAccessor, isAscendingSort, userId } = params;
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "ASC" : "DESC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid AND m.alliance_member_user_id = '${userId}'::uuid`),
    ];
    if (search) {
        commonConditions.push(Prisma.raw(`(
            u.user_username ILIKE '%${search}%'
            OR u.user_id::TEXT ILIKE '%${search}%'
            OR u.user_first_name ILIKE '%${search}%'
            OR u.user_last_name ILIKE '%${search}%'
          )`));
    }
    const dataQueryConditions = [...commonConditions];
    const dataWhereClause = Prisma.sql `${Prisma.join(dataQueryConditions, " AND ")}`;
    const withdrawals = await prisma.$queryRaw `
      SELECT 
        u.user_first_name,
        u.user_last_name,
        u.user_email,
        m.alliance_member_id,
        t.*
      FROM alliance_schema.alliance_withdrawal_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
      JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      WHERE ${dataWhereClause}
      ${orderBy}
      LIMIT ${Prisma.raw(limit.toString())}
      OFFSET ${Prisma.raw(offset.toString())}
    `;
    const totalCount = await prisma.$queryRaw `
        SELECT 
          COUNT(*) AS count
        FROM alliance_schema.alliance_withdrawal_request_table t
        JOIN alliance_schema.alliance_member_table m 
          ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
        JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      WHERE ${dataWhereClause}
    `;
    return { data: withdrawals, totalCount: Number(totalCount[0].count) };
};
export const updateWithdrawModel = async (params) => {
    const { status, note, requestId, teamMemberProfile } = params;
    const result = await prisma.$transaction(async (tx) => {
        const existingRequest = await tx.alliance_withdrawal_request_table.findUnique({
            where: { alliance_withdrawal_request_id: requestId },
        });
        if (!existingRequest) {
            throw new Error("Request not found.");
        }
        if (teamMemberProfile.alliance_member_id !==
            existingRequest.alliance_withdrawal_request_approved_by &&
            teamMemberProfile.alliance_member_role === "ACCOUNTING") {
            throw new Error("You are not authorized to update this request.");
        }
        const updatedRequest = await tx.alliance_withdrawal_request_table.update({
            where: { alliance_withdrawal_request_id: requestId },
            data: {
                alliance_withdrawal_request_status: status,
                alliance_withdrawal_request_approved_by: teamMemberProfile.alliance_member_role === "ADMIN"
                    ? teamMemberProfile.alliance_member_id
                    : undefined,
                alliance_withdrawal_request_reject_note: note ?? null,
                alliance_withdrawal_request_date_updated: new Date(),
            },
        });
        if (status === "REJECTED") {
            const earningsType = updatedRequest.alliance_withdrawal_request_withdraw_type === "PACKAGE"
                ? "alliance_olympus_earnings"
                : "alliance_referral_bounty";
            await tx.alliance_earnings_table.update({
                where: {
                    alliance_earnings_member_id: updatedRequest.alliance_withdrawal_request_member_id,
                },
                data: {
                    [earningsType]: {
                        increment: updatedRequest.alliance_withdrawal_request_amount,
                    },
                    alliance_combined_earnings: {
                        increment: updatedRequest.alliance_withdrawal_request_amount,
                    },
                },
            });
        }
        await tx.alliance_transaction_table.create({
            data: {
                transaction_description: `${status === "APPROVED"
                    ? "Congratulations! Withdrawal Request Sent"
                    : `Withdrawal Request Failed, ${note}`}`,
                transaction_amount: Number(updatedRequest.alliance_withdrawal_request_amount -
                    updatedRequest.alliance_withdrawal_request_fee),
                transaction_member_id: updatedRequest.alliance_withdrawal_request_member_id,
            },
        });
        await tx.alliance_notification_table.create({
            data: {
                alliance_notification_user_id: updatedRequest.alliance_withdrawal_request_member_id,
                alliance_notification_message: `${status === "APPROVED"
                    ? "Congratulations! Withdrawal Request Sent"
                    : `Withdrawal Request Failed, ${note}`}`,
            },
        });
        return updatedRequest;
    });
    return result;
};
export const withdrawListPostModel = async (params) => {
    const { parameters, teamMemberProfile } = params;
    let returnData = {
        data: {
            APPROVED: { data: [], count: BigInt(0) },
            REJECTED: { data: [], count: BigInt(0) },
            PENDING: { data: [], count: BigInt(0) },
        },
        totalCount: BigInt(0),
    };
    const { page, limit, search, columnAccessor, userFilter, statusFilter, isAscendingSort, dateFilter, } = parameters;
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "DESC" : "ASC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid`),
    ];
    if (teamMemberProfile.alliance_member_role === "ACCOUNTING") {
        commonConditions.push(Prisma.raw(`t.alliance_withdrawal_request_approved_by = '${teamMemberProfile.alliance_member_id}'::uuid`));
    }
    if (userFilter) {
        commonConditions.push(Prisma.raw(`u.user_id::TEXT = '${userFilter}'`));
    }
    if (dateFilter?.start && dateFilter?.end) {
        const startDate = getPhilippinesTime(new Date(dateFilter.start || new Date()), "start");
        const endDate = getPhilippinesTime(new Date(dateFilter.end || new Date()), "end");
        commonConditions.push(Prisma.raw(`t.alliance_withdrawal_request_date_updated::timestamptz BETWEEN '${startDate}'::timestamptz AND '${endDate}'::timestamptz`));
    }
    if (search) {
        commonConditions.push(Prisma.raw(`(
          u.user_username ILIKE '%${search}%'
          OR u.user_id::TEXT ILIKE '%${search}%'
          OR u.user_first_name ILIKE '%${search}%'
          OR u.user_last_name ILIKE '%${search}%'
        )`));
    }
    const dataQueryConditions = [...commonConditions];
    if (statusFilter) {
        dataQueryConditions.push(Prisma.raw(`t.alliance_withdrawal_request_status = '${statusFilter}'`));
    }
    const dataWhereClause = Prisma.sql `${Prisma.join(dataQueryConditions, " AND ")}`;
    const countWhereClause = Prisma.sql `${Prisma.join(commonConditions, " AND ")}`;
    const withdrawals = await prisma.$queryRaw `
    SELECT 
      u.user_id,
      u.user_first_name,
      u.user_last_name,
      u.user_email,
      u.user_username,
      u.user_profile_picture,
      m.alliance_member_id,
      t.*,
      approver.user_username AS approver_username,
      approver.user_profile_picture AS approver_profile_picture,
      approver.user_id AS approver_id
    FROM alliance_schema.alliance_withdrawal_request_table t
    JOIN alliance_schema.alliance_member_table m 
      ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
    JOIN user_schema.user_table u 
      ON u.user_id = m.alliance_member_user_id
    LEFT JOIN alliance_schema.alliance_member_table mt 
      ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
    LEFT JOIN user_schema.user_table approver 
      ON approver.user_id = mt.alliance_member_user_id
    WHERE ${dataWhereClause}
    ${orderBy}
    LIMIT ${Prisma.raw(limit.toString())}
    OFFSET ${Prisma.raw(offset.toString())}
  `;
    const statusCounts = await prisma.$queryRaw `
      SELECT 
        t.alliance_withdrawal_request_status AS status, 
        COUNT(*) AS count
      FROM alliance_schema.alliance_withdrawal_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
      JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      LEFT JOIN alliance_schema.alliance_member_table mt 
        ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
      LEFT JOIN user_schema.user_table approver 
        ON approver.user_id = mt.alliance_member_user_id
      WHERE ${countWhereClause}
      GROUP BY t.alliance_withdrawal_request_status
    `;
    ["APPROVED", "REJECTED", "PENDING"].forEach((status) => {
        const match = statusCounts.find((item) => item.status === status);
        returnData.data[status].count = match
            ? BigInt(match.count)
            : BigInt(0);
    });
    withdrawals.forEach((request) => {
        const status = request.alliance_withdrawal_request_status;
        if (returnData.data[status]) {
            returnData.data[status].data.push(request);
        }
    });
    returnData.totalCount = statusCounts.reduce((sum, item) => sum + BigInt(item.count), BigInt(0));
    return JSON.parse(JSON.stringify(returnData, (key, value) => typeof value === "bigint" ? value.toString() : value));
};
export const withdrawGetModel = async (teamMemberProfile) => {
    const data = await prisma.alliance_preferred_withdrawal_table.findMany({
        where: {
            alliance_preferred_withdrawal_member_id: teamMemberProfile.alliance_member_id,
        },
    });
    return data;
};
export const withdrawHistoryReportPostModel = async (params) => {
    const { dateFilter } = params;
    const { startDate, endDate } = dateFilter;
    const withdrawalData = await prisma.alliance_withdrawal_request_table.aggregate({
        where: {
            alliance_withdrawal_request_date: {
                gte: startDate
                    ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
                    : undefined, // Start of day in UTC
                lte: endDate
                    ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
                    : undefined, // End of day in UTC
            },
            alliance_withdrawal_request_status: "APPROVED",
        },
        _count: true,
        _sum: {
            alliance_withdrawal_request_amount: true,
            alliance_withdrawal_request_fee: true,
        },
    });
    const returnData = {
        total_request: withdrawalData._count,
        total_amount: (withdrawalData._sum.alliance_withdrawal_request_amount || 0) -
            (withdrawalData._sum.alliance_withdrawal_request_fee || 0),
    };
    return returnData;
};
export const withdrawHistoryReportPostTotalModel = async (params) => {
    const { take, skip, type } = params;
    const intervals = [];
    let currentEnd = new Date(); // Start with today at 11:59 PM
    currentEnd.setHours(23, 59, 59, 999);
    // Adjust the initial end date based on the skip count
    switch (type) {
        case "DAILY":
            currentEnd.setDate(currentEnd.getDate() - skip);
            break;
        case "WEEKLY":
            currentEnd.setDate(currentEnd.getDate() - 7 * skip);
            break;
        case "MONTHLY":
            currentEnd.setMonth(currentEnd.getMonth() - skip);
            break;
        default:
            throw new Error("Invalid type provided");
    }
    // Step 2: Calculate intervals based on the type
    for (let i = 0; i < take; i++) {
        const intervalEnd = new Date(currentEnd);
        let intervalStart = new Date(currentEnd);
        switch (type) {
            case "DAILY":
                intervalStart.setDate(intervalEnd.getDate()); // Same day
                intervalStart.setHours(0, 0, 0, 0); // 12:00 AM
                break;
            case "WEEKLY":
                intervalStart.setDate(intervalEnd.getDate() - 6); // Start of the week
                intervalStart.setHours(0, 0, 0, 0); // 12:00 AM
                break;
            case "MONTHLY":
                intervalStart.setDate(1); // First day of the month
                intervalStart.setHours(0, 0, 0, 0); // 12:00 AM
                break;
        }
        intervals.push({
            start: getPhilippinesTime(intervalStart, "start"),
            end: getPhilippinesTime(intervalEnd, "end"),
        });
        // Move currentEnd to the previous interval
        switch (type) {
            case "DAILY":
                currentEnd.setDate(currentEnd.getDate() - 1);
                break;
            case "WEEKLY":
                currentEnd.setDate(currentEnd.getDate() - 7);
                break;
            case "MONTHLY":
                currentEnd.setMonth(currentEnd.getMonth() - 1);
                currentEnd.setDate(new Date(currentEnd.getFullYear(), currentEnd.getMonth() + 1, 0).getDate()); // Last day of the month
                break;
        }
        currentEnd.setHours(23, 59, 59, 999); // Set to 11:59 PM
    }
    const aggregatedResults = [];
    // Step 3: Execute queries for each interval
    for (const interval of intervals) {
        const reportData = await prisma.$queryRaw `
    WITH approval_summary AS (
      SELECT 
        t.alliance_withdrawal_request_id,
        CASE 
          WHEN mr.alliance_member_role = 'ADMIN' THEN 'ADMIN'
          WHEN mt.alliance_member_role = 'ACCOUNTING' THEN 'ACCOUNTING'
        END AS approver_role,
        t.alliance_withdrawal_request_amount - t.alliance_withdrawal_request_fee AS net_approved_amount
      FROM alliance_schema.alliance_withdrawal_request_table t
      LEFT JOIN alliance_schema.alliance_member_table mt 
        ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
        AND mt.alliance_member_role = 'ACCOUNTING'
      LEFT JOIN alliance_schema.alliance_member_table mr 
        ON mr.alliance_member_id = t.alliance_withdrawal_request_approved_by
        AND mr.alliance_member_role = 'ADMIN'
      WHERE t.alliance_withdrawal_request_date_updated::timestamptz BETWEEN ${interval.start}::timestamptz AND ${interval.end}::timestamptz
        AND t.alliance_withdrawal_request_status = 'APPROVED'
    ),
    role_aggregates AS (
      SELECT 
        approver_role,
        COUNT(*) AS total_approvals,
        SUM(net_approved_amount) AS total_approved_amount
      FROM approval_summary
      GROUP BY approver_role
    )

    SELECT 
      ${interval.start}::timestamptz AS interval_start,
      ${interval.end}::timestamptz AS interval_end,
      COALESCE((SELECT total_approvals FROM role_aggregates WHERE approver_role = 'ACCOUNTING'), 0) AS total_accounting_approvals,
      COALESCE((SELECT total_approvals FROM role_aggregates WHERE approver_role = 'ADMIN'), 0) AS total_admin_approvals,
      COALESCE((SELECT total_approved_amount FROM role_aggregates WHERE approver_role = 'ADMIN'), 0) AS total_admin_approved_amount,
      COALESCE((SELECT total_approved_amount FROM role_aggregates WHERE approver_role = 'ACCOUNTING'), 0) AS total_accounting_approved_amount,
      (SELECT SUM(net_approved_amount) FROM approval_summary) AS total_net_approved_amount
  `;
        aggregatedResults.push(reportData[0]);
    }
    // Step 4: Convert bigints and return the result
    return JSON.parse(JSON.stringify(aggregatedResults, (key, value) => typeof value === "bigint" ? value.toString() : value));
};
