import prisma from "../../utils/prisma.js";
export const leaderboardPostModel = async (params) => {
    const { leaderBoardType, limit, page } = params;
    const offset = (page - 1) * limit;
    console.log(leaderBoardType);
    if (leaderBoardType === "DIRECT" || leaderBoardType === "INDIRECT") {
        const totalCount = (await prisma.$queryRaw `
        SELECT COUNT(DISTINCT package_ally_bounty_member_id) AS count
        FROM packages_schema.package_ally_bounty_log
        WHERE package_ally_bounty_type = ${leaderBoardType}
      `)[0]?.count || 0;
        const leaderBoardData = await prisma.$queryRaw `
    SELECT
      package_ally_bounty_member_id as member_id,
      SUM(package_ally_bounty_earnings) AS totalamount,
      COUNT(DISTINCT package_ally_bounty_from) AS totalreferral
    FROM packages_schema.package_ally_bounty_log
    WHERE package_ally_bounty_type = ${leaderBoardType}
    GROUP BY package_ally_bounty_member_id
    ORDER BY totalamount DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
        const memberIds = leaderBoardData.map((entry) => entry.member_id);
        // Fetch usernames for the members in the leaderboard
        const members = await prisma.alliance_member_table.findMany({
            where: { alliance_member_id: { in: memberIds } },
            include: { user_table: { select: { user_username: true } } },
        });
        const memberLookup = Object.fromEntries(members.map((m) => [
            m.alliance_member_id.trim(),
            m.user_table?.user_username || "Unknown",
        ]));
        const leaderboardWithUserDetails = leaderBoardData.map((entry) => ({
            username: memberLookup[entry.member_id] || "Unknown",
            totalamount: Number(entry.totalamount) || 0,
            totalReferral: Number(entry.totalreferral) || 0,
        }));
        return {
            totalCount: Number(totalCount),
            data: leaderboardWithUserDetails,
        };
    }
    else if (leaderBoardType === "PACKAGE") {
        const packageTotalCount = await prisma.dashboard_earnings_summary.count({
            take: limit,
            skip: offset,
        });
        const packageData = await prisma.$queryRaw `
  SELECT
  member_id as member_id,
  package_income as totalamount,
  user_username as username
  FROM alliance_schema.dashboard_earnings_summary
  INNER JOIN alliance_schema.alliance_member_table
  ON alliance_member_id = dashboard_earnings_summary.member_id
  INNER JOIN user_schema.user_table
  ON user_id = alliance_member_table.alliance_member_user_id
  ORDER BY totalamount DESC
  LIMIT ${limit} OFFSET ${offset}
`;
        return {
            totalCount: Number(packageTotalCount),
            data: packageData,
        };
    }
};
