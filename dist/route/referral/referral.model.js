import { Prisma } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
export const referralDirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, dateFilter, } = params;
    const returnData = {
        data: [],
        totalCount: 0,
        totalAmount: 0,
        totalCountByDate: 0,
    };
    const cacheKey = `referral-direct-${teamMemberProfile.alliance_member_id}-${page}-${limit}-${search}-${columnAccessor}-${isAscendingSort}-${dateFilter?.start}-${dateFilter?.end}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const offset = Math.max((page - 1) * limit, 0);
    const startDate = dateFilter?.start
        ? getPhilippinesTime(new Date(dateFilter?.start), "start")
        : null;
    const endDate = dateFilter?.end
        ? getPhilippinesTime(new Date(dateFilter?.end), "end")
        : null;
    const searchCondition = search
        ? Prisma.sql `
      AND (u.user_first_name ILIKE ${"%" + search + "%"} 
      OR u.user_last_name ILIKE ${"%" + search + "%"} 
      OR u.user_username ILIKE ${"%" + search + "%"})`
        : Prisma.empty;
    const dateFilterCondition = dateFilter?.start && dateFilter?.end
        ? Prisma.sql `AND pa.package_ally_bounty_log_date_created 
        BETWEEN ${Prisma.raw(`'${startDate}'::timestamptz`)} 
        AND ${Prisma.raw(`'${endDate}'::timestamptz`)}`
        : Prisma.empty;
    const direct = await prisma.$queryRaw `
    SELECT
      u.user_first_name,
      u.user_last_name,
      u.user_username,
      pa.package_ally_bounty_log_date_created,
      COALESCE(SUM(pa.package_ally_bounty_earnings), 0) AS total_bounty_earnings
    FROM alliance_schema.alliance_member_table m
    JOIN user_schema.user_table u ON u.user_id = m.alliance_member_user_id
    JOIN packages_schema.package_ally_bounty_log pa ON pa.package_ally_bounty_from = m.alliance_member_id
    WHERE pa.package_ally_bounty_member_id = ${teamMemberProfile.alliance_member_id}::uuid AND pa.package_ally_bounty_type = 'DIRECT'
      ${searchCondition}
      ${dateFilterCondition}
    GROUP BY u.user_first_name, u.user_last_name, u.user_username, pa.package_ally_bounty_log_date_created
    ORDER BY pa.package_ally_bounty_log_date_created DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
    const totalCount = await prisma.$queryRaw `
    SELECT COUNT(*) AS count
    FROM (
        SELECT 1
        FROM alliance_schema.alliance_member_table m
        JOIN user_schema.user_table u ON u.user_id = m.alliance_member_user_id
        JOIN packages_schema.package_ally_bounty_log pa ON pa.package_ally_bounty_from = m.alliance_member_id
        WHERE pa.package_ally_bounty_member_id = ${teamMemberProfile.alliance_member_id}::uuid AND pa.package_ally_bounty_type = 'DIRECT'
          ${searchCondition}
          ${dateFilterCondition}
        GROUP BY u.user_first_name, u.user_last_name, u.user_username, pa.package_ally_bounty_log_date_created
    ) AS subquery;
`;
    if (startDate && endDate) {
        const result = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(DISTINCT package_ally_bounty_from) AS total_count,
      SUM(DISTINCT package_ally_bounty_earnings) AS total_amount
    FROM packages_schema.package_ally_bounty_log
    WHERE package_ally_bounty_member_id = $1::uuid
      AND package_ally_bounty_type = 'DIRECT'
      AND package_ally_bounty_log_date_created BETWEEN $2::timestamptz AND $3::timestamptz
  `, teamMemberProfile.alliance_member_id, startDate, endDate);
        returnData.totalAmount = Number(result[0]?.total_amount || 0);
        returnData.totalCountByDate = Number(result[0]?.total_count || 0);
    }
    returnData.data = direct;
    returnData.totalCount = Number(totalCount[0]?.count || 0);
    await redis.set(cacheKey, JSON.stringify(returnData), { ex: 300 });
    return returnData;
};
export const referralIndirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, dateFilter, } = params;
    const returnData = {
        data: [],
        totalCount: 0,
        totalAmount: 0,
    };
    const cacheKey = `referral-indirect-${teamMemberProfile.alliance_member_id}-${page}-${limit}-${search}-${columnAccessor}-${isAscendingSort}-${dateFilter?.start}-${dateFilter?.end}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const directReferrals = await prisma.alliance_referral_table.findMany({
        where: {
            alliance_referral_from_member_id: teamMemberProfile.alliance_member_id,
        },
        select: { alliance_referral_member_id: true },
    });
    const directReferralIds = directReferrals.map((ref) => ref.alliance_referral_member_id);
    let indirectReferrals = new Set();
    let currentLevelReferrals = [teamMemberProfile.alliance_member_id];
    let currentLevel = 0;
    const maxLevel = 10;
    while (currentLevel < maxLevel && currentLevelReferrals.length > 0) {
        const referrerData = await prisma.$queryRaw `
    SELECT ar.alliance_referral_hierarchy
    FROM alliance_schema.alliance_referral_table ar
    JOIN alliance_schema.alliance_referral_link_table al
      ON al.alliance_referral_link_id = ar.alliance_referral_link_id
    WHERE al.alliance_referral_link_member_id = ANY (${currentLevelReferrals}::uuid[])
  `;
        let nextLevelReferrals = [];
        referrerData.forEach((ref) => {
            const hierarchyArray = ref.alliance_referral_hierarchy
                .split(".")
                .slice(1);
            hierarchyArray.forEach((id) => {
                if (!indirectReferrals.has(id) &&
                    id !== teamMemberProfile.alliance_member_id) {
                    indirectReferrals.add(id);
                    nextLevelReferrals.push(id);
                }
            });
        });
        currentLevelReferrals = nextLevelReferrals;
        currentLevel++;
    }
    const finalIndirectReferralIds = Array.from(indirectReferrals).filter((id) => !directReferralIds.includes(id));
    if (finalIndirectReferralIds.length === 0) {
        return { success: false, message: "No referral data found" };
    }
    const startDate = dateFilter?.start
        ? getPhilippinesTime(new Date(dateFilter?.start), "start")
        : null;
    const endDate = dateFilter?.end
        ? getPhilippinesTime(new Date(dateFilter?.end), "end")
        : null;
    const offset = Math.max((page - 1) * limit, 0);
    const searchCondition = search
        ? Prisma.sql `
      AND (ut.user_first_name ILIKE ${"%" + search + "%"} 
      OR ut.user_last_name ILIKE ${"%" + search + "%"} 
      OR ut.user_username ILIKE ${"%" + search + "%"})`
        : Prisma.empty;
    const dateFilterCondition = dateFilter?.start && dateFilter?.end
        ? Prisma.sql `AND pa.package_ally_bounty_log_date_created 
        BETWEEN ${Prisma.raw(`'${startDate}'::timestamptz`)} 
        AND ${Prisma.raw(`'${endDate}'::timestamptz`)}`
        : Prisma.empty;
    const indirectReferralDetails = await prisma.$queryRaw `
  SELECT 
    ut.user_first_name, 
    ut.user_last_name, 
    ut.user_username, 
    pa.package_ally_bounty_log_date_created,
    COALESCE(SUM(pa.package_ally_bounty_earnings), 0) AS total_bounty_earnings
  FROM alliance_schema.alliance_member_table am
  JOIN user_schema.user_table ut
    ON ut.user_id = am.alliance_member_user_id
  JOIN packages_schema.package_ally_bounty_log pa
    ON am.alliance_member_id = pa.package_ally_bounty_from
  WHERE pa.package_ally_bounty_from = ANY(${finalIndirectReferralIds}::uuid[])
    AND pa.package_ally_bounty_member_id = ${teamMemberProfile.alliance_member_id}::uuid
    ${searchCondition}
    ${dateFilterCondition}
  GROUP BY 
    ut.user_first_name, 
    ut.user_last_name, 
    ut.user_username, 
    pa.package_ally_bounty_log_date_created
  ORDER BY pa.package_ally_bounty_log_date_created DESC
  LIMIT ${limit} OFFSET ${offset}
`;
    const totalCountResult = await prisma.$queryRaw `
  SELECT 
    COUNT(*) AS count
  FROM (
    SELECT pa.package_ally_bounty_from
    FROM alliance_schema.alliance_member_table am
    JOIN user_schema.user_table ut
      ON ut.user_id = am.alliance_member_user_id
    JOIN packages_schema.package_ally_bounty_log pa
      ON am.alliance_member_id = pa.package_ally_bounty_from
    WHERE pa.package_ally_bounty_from = ANY(${finalIndirectReferralIds}::uuid[])
      AND pa.package_ally_bounty_member_id = ${teamMemberProfile.alliance_member_id}::uuid
      ${searchCondition}
      ${dateFilterCondition}
    GROUP BY 
      pa.package_ally_bounty_from,

      ut.user_first_name,
      ut.user_last_name,
      ut.user_username,
      ut.user_date_created,
      am.alliance_member_id,
      pa.package_ally_bounty_log_date_created
  ) AS subquery
`;
    if (startDate && endDate) {
        const totalCount = await prisma.package_ally_bounty_log.aggregate({
            where: {
                package_ally_bounty_member_id: teamMemberProfile.alliance_member_id,
                package_ally_bounty_type: "INDIRECT",
                package_ally_bounty_log_date_created: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                package_ally_bounty_earnings: true,
            },
            _count: true,
        });
        returnData.totalAmount = Number(totalCount._sum.package_ally_bounty_earnings || 0);
    }
    returnData.data = indirectReferralDetails;
    returnData.totalCount = Number(totalCountResult[0]?.count || 0);
    await redis.set(cacheKey, returnData, { ex: 300 });
    return returnData;
};
export const referralTotalGetModel = async (params) => {
    const { teamMemberProfile } = params;
    return await prisma.$transaction(async (tx) => {
        const [result] = await tx.$queryRaw `
      SELECT
        package_ally_bounty_member_id,
        SUM(package_ally_bounty_earnings) AS totalamount,
        COUNT(DISTINCT package_ally_bounty_from) AS totalreferral
      FROM packages_schema.package_ally_bounty_log
      WHERE package_ally_bounty_member_id::uuid = ${teamMemberProfile.alliance_member_id}::uuid
      GROUP BY package_ally_bounty_member_id
    `;
        return {
            data: result ? result.totalamount || 0 : 0, // Proper fallback to 0
        };
    });
};
export const referralUserModelPost = async (params) => {
    const { teamMemberId, page, limit, search } = params;
    const cacheKey = `referral-user-${teamMemberId}-${page}-${limit}-${search}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const offset = Math.max((page - 1) * limit, 0);
    const directReferrals = await prisma.alliance_referral_table.findMany({
        where: {
            alliance_referral_from_member_id: teamMemberId,
        },
        select: { alliance_referral_member_id: true },
        take: limit,
        skip: offset,
        orderBy: {
            alliance_referral_date: "desc",
        },
    });
    const totalCount = await prisma.alliance_referral_table.count({
        where: {
            alliance_referral_from_member_id: teamMemberId,
        },
    });
    const directReferralIds = directReferrals.map((ref) => ref.alliance_referral_member_id);
    const teamMembers = await prisma.alliance_member_table.findMany({
        where: {
            alliance_member_id: { in: directReferralIds },
            user_table: {
                user_username: {
                    contains: search ? search : "",
                    mode: "insensitive",
                },
            },
        },
        include: {
            user_table: {
                select: {
                    user_username: true,
                },
            },
        },
    });
    if (!teamMembers.length) {
        return { success: false, message: "No users found" };
    }
    const formattedTeamMembers = teamMembers.map((member) => ({
        user_username: member.user_table.user_username,
    }));
    const returnData = {
        data: formattedTeamMembers,
        totalCount: totalCount,
    };
    await redis.set(cacheKey, JSON.stringify(returnData), { ex: 300 });
    return returnData;
};
