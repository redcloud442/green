import { PrismaClient } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import { redis } from "../../utils/redis.js";

const prisma = new PrismaClient();

export const dashboardPostModel = async (params: {
  dateFilter: { start?: string; end?: string };
}) => {
  return await prisma.$transaction(async (tx) => {
    const { dateFilter } = params;

    const startDate = dateFilter.start
      ? new Date(
          getPhilippinesTime(new Date(dateFilter.start), "start")
        ).toISOString()
      : getPhilippinesTime(new Date(), "start");

    const endDate = dateFilter.end
      ? getPhilippinesTime(new Date(dateFilter.end), "end")
      : getPhilippinesTime(new Date(), "end");

    const [
      totalEarnings,
      packageEarnings,
      totalActivatedUserByDate,
      totalApprovedWithdrawal,
      totalApprovedReceipts,
      totalWithdraw,
      bountyEarnings,
      activePackageWithinTheDay,
      chartDataRaw,
      data,
    ] = await Promise.all([
      tx.alliance_top_up_request_table.aggregate({
        _sum: { alliance_top_up_request_amount: true },
        where: {
          alliance_top_up_request_date_updated: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
          alliance_top_up_request_status: "APPROVED",
        },
      }),

      tx.package_member_connection_table.aggregate({
        _sum: { package_member_amount: true, package_amount_earnings: true },
        where: {
          package_member_connection_created: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.alliance_member_table.count({
        where: {
          alliance_member_is_active: true,
          alliance_member_date_updated: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.alliance_withdrawal_request_table.count({
        where: {
          alliance_withdrawal_request_status: "APPROVED",
          alliance_withdrawal_request_date_updated: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.alliance_top_up_request_table.count({
        where: {
          alliance_top_up_request_status: "APPROVED",
          alliance_top_up_request_date_updated: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.alliance_withdrawal_request_table.aggregate({
        _sum: {
          alliance_withdrawal_request_amount: true,
          alliance_withdrawal_request_fee: true,
        },

        where: {
          alliance_withdrawal_request_status: "APPROVED",
          alliance_withdrawal_request_date_updated: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.package_ally_bounty_log.groupBy({
        by: ["package_ally_bounty_type"],
        _sum: { package_ally_bounty_earnings: true },
        where: {
          package_ally_bounty_log_date_created: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.package_member_connection_table.count({
        where: {
          package_member_connection_created: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),

      tx.$queryRaw`
      WITH daily_earnings AS (
        SELECT DATE_TRUNC('day', alliance_top_up_request_date_updated AT TIME ZONE 'Asia/Manila') AS date,
               SUM(COALESCE(alliance_top_up_request_amount, 0)) AS earnings
        FROM alliance_schema.alliance_top_up_request_table
        WHERE alliance_top_up_request_date_updated BETWEEN ${new Date(
          startDate || new Date()
        ).toISOString()}::timestamptz AND ${new Date(
        endDate || new Date()
      ).toISOString()}::timestamptz
        AND alliance_top_up_request_status = 'APPROVED'
        GROUP BY DATE_TRUNC('day', alliance_top_up_request_date_updated AT TIME ZONE 'Asia/Manila')
      ),
      daily_withdraw AS (
        SELECT DATE_TRUNC('day', alliance_withdrawal_request_date_updated AT TIME ZONE 'Asia/Manila'  ) AS date,
               SUM(COALESCE(alliance_withdrawal_request_amount, 0) - COALESCE(alliance_withdrawal_request_fee, 0)) AS withdraw
        FROM alliance_schema.alliance_withdrawal_request_table
        WHERE alliance_withdrawal_request_date_updated BETWEEN ${new Date(
          startDate || new Date()
        ).toISOString()}::timestamptz AND ${new Date(
        endDate || new Date()
      ).toISOString()}::timestamptz
        AND alliance_withdrawal_request_status = 'APPROVED'
        GROUP BY DATE_TRUNC('day', alliance_withdrawal_request_date_updated AT TIME ZONE 'Asia/Manila')
      )
      SELECT COALESCE(e.date, w.date) AS date,
             COALESCE(e.earnings, 0) AS earnings,
             COALESCE(w.withdraw, 0) AS withdraw
      FROM daily_earnings e
      FULL OUTER JOIN daily_withdraw w ON e.date = w.date
      ORDER BY date;
    `,

      tx.package_member_connection_table.aggregate({
        _sum: {
          package_member_amount: true,
        },
        _count: {
          package_member_member_id: true,
        },
        where: {
          package_member_is_reinvestment: true,
          package_member_connection_created: {
            gte: getPhilippinesTime(
              new Date(dateFilter.start || new Date()),
              "start"
            ),
            lte: getPhilippinesTime(
              new Date(dateFilter.end || new Date()),
              "end"
            ),
          },
        },
      }),
    ]);

    const directLoot =
      bountyEarnings.find((e) => e.package_ally_bounty_type === "DIRECT")?._sum
        .package_ally_bounty_earnings || 0;
    const indirectLoot =
      bountyEarnings.find((e) => e.package_ally_bounty_type === "INDIRECT")
        ?._sum.package_ally_bounty_earnings || 0;

    const chartData = (
      chartDataRaw as Array<{ date: Date; earnings: number; withdraw: number }>
    ).map((row) => ({
      date: row.date.toISOString().split("T")[0],
      earnings: row.earnings || 0,
      withdraw: row.withdraw || 0,
    }));

    return {
      totalEarnings: totalEarnings._sum.alliance_top_up_request_amount ?? 0,
      totalWithdraw:
        (totalWithdraw._sum.alliance_withdrawal_request_amount ?? 0) -
        (totalWithdraw._sum.alliance_withdrawal_request_fee ?? 0),
      directLoot,
      indirectLoot,
      packageEarnings:
        (packageEarnings._sum.package_member_amount || 0) +
        (packageEarnings._sum.package_amount_earnings || 0),
      totalApprovedWithdrawal,
      totalApprovedReceipts,
      totalActivatedUserByDate,
      activePackageWithinTheDay,
      chartData,
      reinvestorsCount: Number(data?._count.package_member_member_id || 0),
      totalReinvestmentAmount: Number(data?._sum.package_member_amount || 0),
    };
  });
};

export const dashboardGetModel = async () => {
  const cacheKey = `dashboard-get`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const [totalActivatedPackage, numberOfRegisteredUser, totalActivatedUser] =
    await prisma.$transaction([
      prisma.package_member_connection_table.count(),

      prisma.alliance_member_table.count(),

      prisma.alliance_member_table.count({
        where: { alliance_member_is_active: true },
      }),
    ]);

  const data = {
    numberOfRegisteredUser,
    totalActivatedPackage,
    totalActivatedUser,
  };

  await redis.set(cacheKey, JSON.stringify(data), {
    ex: 60 * 5, // 5 minutes
  });

  return data;
};

export const dashboardPostClientModel = async (params: {
  dateFilter?: { start?: string; end?: string };
}) => {
  return await prisma.$transaction(async (tx) => {
    const { dateFilter } = params;

    const startDate = dateFilter?.start
      ? new Date(
          getPhilippinesTime(new Date(dateFilter.start), "start")
        ).toISOString()
      : getPhilippinesTime(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          "start"
        );

    const endDate = dateFilter?.end
      ? getPhilippinesTime(new Date(dateFilter.end), "end")
      : getPhilippinesTime(
          new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          "end"
        );

    const [dailyWithdraw, monthlyWithdraw, dailyEarnings, monthlyEarnings] =
      await Promise.all([
        tx.alliance_withdrawal_request_table.aggregate({
          _sum: {
            alliance_withdrawal_request_amount: true,
            alliance_withdrawal_request_fee: true,
          },

          where: {
            alliance_withdrawal_request_status: "APPROVED",
            alliance_withdrawal_request_date_updated: {
              gte: getPhilippinesTime(new Date(new Date()), "start"),
              lte: getPhilippinesTime(new Date(new Date()), "end"),
            },
          },
        }),

        tx.alliance_withdrawal_request_table.aggregate({
          _sum: {
            alliance_withdrawal_request_amount: true,
            alliance_withdrawal_request_fee: true,
          },

          where: {
            alliance_withdrawal_request_status: "APPROVED",
            alliance_withdrawal_request_date_updated: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),

        tx.alliance_top_up_request_table.aggregate({
          _sum: {
            alliance_top_up_request_amount: true,
          },
          where: {
            alliance_top_up_request_status: "APPROVED",
            alliance_top_up_request_date_updated: {
              gte: getPhilippinesTime(new Date(new Date()), "start"),
              lte: getPhilippinesTime(new Date(new Date()), "end"),
            },
          },
        }),

        tx.alliance_top_up_request_table.aggregate({
          _sum: {
            alliance_top_up_request_amount: true,
          },

          where: {
            alliance_top_up_request_status: "APPROVED",
            alliance_top_up_request_date_updated: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

    const response = {
      dailyWithdraw:
        (dailyWithdraw._sum.alliance_withdrawal_request_amount ?? 0) -
        (dailyWithdraw._sum.alliance_withdrawal_request_fee ?? 0),
      monthlyWithdraw:
        (monthlyWithdraw._sum.alliance_withdrawal_request_amount ?? 0) -
        (monthlyWithdraw._sum.alliance_withdrawal_request_fee ?? 0),
      dailyEarnings: dailyEarnings._sum.alliance_top_up_request_amount ?? 0,
      monthlyEarnings: monthlyEarnings._sum.alliance_top_up_request_amount ?? 0,
    };

    return response;
  });
};
