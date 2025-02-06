import type { UserRequestdata } from "../../utils/types.js";

import {
  Prisma,
  type alliance_member_table,
  type Role,
  type user_table,
} from "@prisma/client";
import bcryptjs from "bcryptjs";
import prisma from "../../utils/prisma.js";
import { supabaseClient } from "../../utils/supabase.js";

export const userModelPut = async (params: {
  userId: string;
  email: string;
  password: string;
}) => {
  const { userId, email, password } = params;

  const user = await prisma.user_table.findFirst({
    where: {
      user_email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const userCompare = await bcryptjs.compare(password, user?.user_password);

  if (!userCompare) {
    return { success: false, error: "Invalid request." };
  }

  const teamMemberProfile = await prisma.alliance_member_table.findFirst({
    where: { alliance_member_user_id: user?.user_id },
  });

  if (!teamMemberProfile) {
    return { success: false, error: "Invalid request." };
  }

  if (
    teamMemberProfile.alliance_member_restricted ||
    !teamMemberProfile.alliance_member_alliance_id
  ) {
    return { success: false, error: "Access restricted" };
  }

  prisma.user_table.update({
    where: {
      user_id: userId,
    },
    data: {
      user_password: password,
    },
  });

  if (teamMemberProfile?.alliance_member_role !== "ADMIN") {
    const supabase = supabaseClient;
    const { error } = await supabase.auth.updateUser({
      email: email,
      password: password,
    });
    if (error) {
      return { success: false, error: "Failed to update user password" };
    }
  } else {
    const supabase = supabaseClient;
    await supabase.auth.admin.updateUserById(userId, {
      password: password,
    });
  }

  return { success: true, message: "Password updated successfully" };
};

export const userModelPost = async (params: { memberId: string }) => {
  const { memberId } = params;

  const user = await prisma.dashboard_earnings_summary.findUnique({
    where: {
      member_id: memberId,
    },
    select: {
      direct_referral_amount: true,
      indirect_referral_amount: true,
      total_earnings: true,
      total_withdrawals: true,
      package_income: true,
      direct_referral_count: true,
    },
  });

  const userEarnings = await prisma.alliance_earnings_table.findUnique({
    where: {
      alliance_earnings_member_id: memberId,
    },
    select: {
      alliance_olympus_wallet: true,
      alliance_olympus_earnings: true,
      alliance_combined_earnings: true,
      alliance_referral_bounty: true,
    },
  });

  const userRaking = await prisma.alliance_ranking_table.findUnique({
    where: {
      alliance_ranking_member_id: memberId,
    },
    select: {
      alliance_rank: true,
      alliance_total_income_tag: true,
    },
  });

  const earnings = Number(user?.total_earnings) || 0;
  const referralCount = Number(user?.direct_referral_count) || 0;

  const rankMapping = [
    { threshold: 500, rank: "diamond" },
    { threshold: 200, rank: "sapphire" },
    { threshold: 150, rank: "ruby" },
    { threshold: 100, rank: "emerald" },
    { threshold: 50, rank: "platinum" },
    { threshold: 20, rank: "gold" },
    { threshold: 10, rank: "silver" },
    { threshold: 6, rank: "bronze" },
    { threshold: 3, rank: "iron" },
  ];

  const incomeTags = [
    { threshold: 2000000, tag: "Multi Millionaire" },
    { threshold: 1000000, tag: "Millionaire" },
    { threshold: 500000, tag: "500k earner" },
    { threshold: 100000, tag: "100k earner" },
    { threshold: 50000, tag: "50k earner" },
  ];

  const applicableRank =
    rankMapping.find((rank) => referralCount >= rank.threshold)?.rank || null;
  const applicableIncomeTag =
    incomeTags.find((tag) => earnings >= tag.threshold)?.tag || null;

  const currentRank = userRaking ? userRaking.alliance_rank : null;
  const currentIncomeTag = userRaking
    ? userRaking.alliance_total_income_tag
    : null;

  if (
    currentRank !== applicableRank ||
    currentIncomeTag !== applicableIncomeTag
  ) {
    if (currentRank !== applicableRank) {
      await prisma.alliance_notification_table.create({
        data: {
          alliance_notification_user_id: memberId,
          alliance_notification_message: `You have been promoted to ${applicableRank}!`,
        },
      });
    }

    if (currentIncomeTag !== applicableIncomeTag && applicableIncomeTag) {
      await prisma.alliance_notification_table.create({
        data: {
          alliance_notification_user_id: memberId,
          alliance_notification_message: `Congratulations! You have achieved the ${applicableIncomeTag} milestone!`,
        },
      });
    }

    await prisma.alliance_ranking_table.upsert({
      where: {
        alliance_ranking_member_id: memberId,
      },
      update: {
        alliance_rank: applicableRank,
        alliance_total_income_tag: applicableIncomeTag,
      },
      create: {
        alliance_ranking_member_id: memberId,
        alliance_rank: applicableRank,
        alliance_total_income_tag: applicableIncomeTag,
      },
    });
  }
  const tags = [];
  if (applicableIncomeTag) tags.push(applicableIncomeTag);

  const totalEarnings = {
    directReferralAmount: user?.direct_referral_amount,
    indirectReferralAmount: user?.indirect_referral_amount,
    totalEarnings: user?.total_earnings,
    withdrawalAmount: user?.total_withdrawals,
    directReferralCount: user?.direct_referral_count,
    package_income: user?.package_income,
    rank: applicableRank,
    totalIncomeTag: tags,
  };

  return { totalEarnings, userEarningsData: userEarnings, userRaking };
};

export const userModelGet = async (params: { memberId: string }) => {
  const { memberId } = params;

  let canWithdrawPackage = false;
  let canWithdrawReferral = false;
  let canUserDeposit = false;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const existingPackageWithdrawal =
    await prisma.alliance_withdrawal_request_table.findFirst({
      where: {
        alliance_withdrawal_request_member_id: memberId,
        alliance_withdrawal_request_status: {
          in: ["PENDING", "APPROVED"],
        },

        alliance_withdrawal_request_withdraw_type: "PACKAGE",
        alliance_withdrawal_request_date: {
          gte: todayStart, // Start of the day
          lte: todayEnd, // End of the day
        },
      },
    });

  // Check for "REFERRAL" withdrawals
  const existingReferralWithdrawal =
    await prisma.alliance_withdrawal_request_table.findFirst({
      where: {
        alliance_withdrawal_request_member_id: memberId,
        alliance_withdrawal_request_status: {
          in: ["PENDING", "APPROVED"],
        },
        alliance_withdrawal_request_withdraw_type: "REFERRAL",
        alliance_withdrawal_request_date: {
          gte: todayStart, // Start of the day
          lte: todayEnd, // End of the day
        },
      },
    });

  if (existingPackageWithdrawal !== null) {
    canWithdrawPackage = true;
  }

  if (existingReferralWithdrawal !== null) {
    canWithdrawReferral = true;
  }

  const existingDeposit = await prisma.alliance_top_up_request_table.findFirst({
    where: {
      alliance_top_up_request_member_id: memberId,
      alliance_top_up_request_status: "PENDING",
    },
    take: 1,
    orderBy: {
      alliance_top_up_request_date: "desc",
    },
  });

  if (existingDeposit !== null) {
    canUserDeposit = true;
  }

  return { canWithdrawPackage, canWithdrawReferral, canUserDeposit };
};

export const userPatchModel = async (params: {
  memberId: string;
  action: string;
  role: Role;
  type: string;
}) => {
  const { memberId, action, role, type } = params;

  if (action === "updateRole") {
    await prisma.alliance_member_table.update({
      where: { alliance_member_id: memberId },
      data: {
        alliance_member_role: role,
        alliance_member_date_updated: new Date(),
        alliance_member_is_active:
          role &&
          ["ADMIN", "MERCHANT", "ACCOUNTING"].some((r) => role.includes(r))
            ? true
            : undefined, // Stay as is if no role is included
      },
    });

    if (role === "ADMIN" || role === "ACCOUNTING" || role === "MERCHANT") {
      await prisma.alliance_earnings_table.upsert({
        where: {
          alliance_earnings_member_id: memberId,
        },
        update: {},
        create: {
          alliance_earnings_member_id: memberId,
        },
      });
    }

    if (role === "MERCHANT") {
      await prisma.merchant_member_table.create({
        data: {
          merchant_member_merchant_id: memberId,
        },
      });
    }

    return {
      success: true,
      message: "User role updated successfully.",
    };
  }

  if (action === "banUser") {
    if (type === "BAN") {
      await prisma.alliance_member_table.update({
        where: { alliance_member_id: memberId },
        data: { alliance_member_restricted: true },
      });
    } else if (type === "UNBAN") {
      await prisma.alliance_member_table.update({
        where: { alliance_member_id: memberId },
        data: { alliance_member_restricted: false },
      });
    }

    return {
      success: true,
      message: "User banned successfully.",
    };
  }
};

export const userSponsorModel = async (params: { userId: string }) => {
  const { userId } = params;
  

  const user: { user_username: string }[] = await prisma.$queryRaw`
  SELECT 
        ut2.user_username
      FROM user_schema.user_table ut
      JOIN alliance_schema.alliance_member_table am
        ON am.alliance_member_user_id = ut.user_id
      JOIN alliance_schema.alliance_referral_table art
        ON art.alliance_referral_member_id = am.alliance_member_id
      JOIN alliance_schema.alliance_member_table am2
        ON am2.alliance_member_id = art.alliance_referral_from_member_id
      JOIN user_schema.user_table ut2
        ON ut2.user_id = am2.alliance_member_user_id
      WHERE ut.user_id = ${userId}::uuid
  `;

  if (!user) {
    return { success: false, error: "User not found." };
  }

  return user[0].user_username;
};

export const userProfileModelPut = async (params: {
  profilePicture: string;
  userId: string;
}) => {
  const { profilePicture, userId } = params;
  await prisma.$transaction(async (tx) => {
    await tx.user_table.update({
      where: { user_id: userId },
      data: { user_profile_picture: profilePicture },
    });
  });
};

export const userGenerateLinkModel = async (params: {
  formattedUserName: string;
}) => {
  const { formattedUserName } = params;

  const { data, error } = await supabaseClient.auth.admin.generateLink({
    type: "magiclink",
    email: formattedUserName,
  });

  if (error) throw error;

  return data.properties;
};

export const userListModel = async (
  params: {
    page: number;
    limit: number;
    search: string;
    columnAccessor: string;
    isAscendingSort: boolean;
    userRole?: string;
    dateCreated?: string;
    bannedUser?: boolean;
  },
  teamMemberProfile: alliance_member_table
) => {
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
  } = params;

  const offset = (page - 1) * limit;

  const whereCondition: any = {
    alliance_member_alliance_id: teamMemberProfile.alliance_member_alliance_id,
  };

  if (search) {
    whereCondition.OR = [
      {
        user_table: {
          user_username: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user_table: {
          user_first_name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user_table: {
          user_last_name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (userRole !== "") {
    whereCondition.alliance_member_role = userRole;
  }

  if (dateCreated) {
    whereCondition.user_table = {
      user_date_created: {
        gte: new Date(dateCreated),
        lte: new Date(dateCreated),
      },
    };
  }

  if (bannedUser) {
    whereCondition.alliance_member_restricted = true;
  }

  let orderByCondition = {};

  if (columnAccessor) {
    if (columnAccessor.startsWith("user")) {
      orderByCondition = {
        user_table: {
          [columnAccessor]: isAscendingSort ? "desc" : "asc",
        },
      };
    } else {
      orderByCondition = {
        [columnAccessor]: isAscendingSort ? "desc" : "asc",
      };
    }
  }

  const userRequest = await prisma.alliance_member_table.findMany({
    where: whereCondition,
    include: {
      user_table: true,
      merchant_member_table: true,
    },
    orderBy: orderByCondition,
    take: limit,
    skip: offset,
  });

  const totalCount = await prisma.alliance_member_table.count({
    where: whereCondition,
  });

  const formattedData: UserRequestdata[] = userRequest.map((entry) => ({
    alliance_member_id: entry.alliance_member_id,
    alliance_member_role: entry.alliance_member_role,
    alliance_member_date_created:
      entry.alliance_member_date_created.toISOString(),
    alliance_member_alliance_id: entry.alliance_member_alliance_id,
    alliance_member_user_id: entry.alliance_member_user_id,
    alliance_member_restricted: entry.alliance_member_restricted,
    alliance_member_date_updated:
      entry.alliance_member_date_updated?.toISOString() || "",
    alliance_member_is_active: entry.alliance_member_is_active,
    user_id: entry.user_table.user_id,
    user_username: entry.user_table.user_username || "",
    user_first_name: entry.user_table.user_first_name || "",
    user_last_name: entry.user_table.user_last_name || "",
    user_date_created: entry.user_table.user_date_created.toISOString(),
    user_profile_picture: entry.user_table.user_profile_picture || "",
  }));

  return {
    totalCount,
    data: formattedData,
  };
};

export const userActiveListModel = async (params: {
  page: number;
  limit: number;
  search: string;
  columnAccessor: string;
  isAscendingSort: boolean;
}) => {
  const { page, limit, search, columnAccessor, isAscendingSort } = params;

  const offset = (page - 1) * limit;

  const sortBy = isAscendingSort ? "ASC" : "DESC";

  const orderBy = columnAccessor
    ? Prisma.sql`ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
    : Prisma.empty;
  const searchCondition = search
    ? Prisma.sql`
        AND (
          ut.user_username ILIKE ${`%${search}%`} OR
          ut.user_first_name ILIKE ${`%${search}%`} OR
          ut.user_last_name ILIKE ${`%${search}%`}
        )
      `
    : Prisma.empty;

  const usersWithActiveWallet: user_table[] = await prisma.$queryRaw`
    SELECT 
      ut.user_id,
      ut.user_username,
      ut.user_first_name,
      ut.user_last_name,
      ut.user_profile_picture,
      am.alliance_member_is_active
    FROM user_schema.user_table ut
    JOIN alliance_schema.alliance_member_table am
      ON ut.user_id = am.alliance_member_user_id
    LEFT JOIN alliance_schema.alliance_earnings_table ae
      ON ae.alliance_earnings_member_id = am.alliance_member_id
    WHERE 
      ae.alliance_combined_earnings > 0
      ${searchCondition}
      ${orderBy}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const totalCount: { count: bigint }[] = await prisma.$queryRaw`
    SELECT 
      COUNT(*)
    FROM user_schema.user_table ut
    JOIN alliance_schema.alliance_member_table am
      ON ut.user_id = am.alliance_member_user_id
    LEFT JOIN alliance_schema.alliance_earnings_table ae
      ON ae.alliance_earnings_member_id = am.alliance_member_id
      WHERE 
      ae.alliance_combined_earnings > 0
      ${searchCondition}
    `;

  return {
    data: usersWithActiveWallet,
    totalCount: Number(totalCount[0]?.count ?? 0),
  };
};

export const userChangePasswordModel = async (params: {
  password: string;
  userId: string;
}) => {
  const { password, userId } = params;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user_table.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await tx.user_table.update({
      where: { user_id: userId },
      data: { user_password: hashedPassword },
    });

    await supabaseClient.auth.admin.updateUserById(userId, {
      password: password,
    });
  });
};

export const userPreferredBankModel = async (
  params: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  },
  teamMemberProfile: alliance_member_table
) => {
  const { accountNumber, accountName, bankName } = params;

  const data = await prisma.$transaction(async (tx) => {
    const response = await tx.alliance_preferred_withdrawal_table.create({
      data: {
        alliance_preferred_withdrawal_member_id:
          teamMemberProfile.alliance_member_id,

        alliance_preferred_withdrawal_account_number: accountNumber,
        alliance_preferred_withdrawal_account_name: accountName,
        alliance_preferred_withdrawal_bank_name: bankName,
      },
    });

    return response;
  });

  return data;
};

export const userProfileDataPutModel = async (params: {
  value: string;
  type: string;
  userId: string;
}) => {
  const { value, type, userId } = params;

  if (type === "activeMobile") {
    await prisma.$transaction(async (tx) => {
      await tx.user_table.update({
        where: { user_id: userId },
        data: { user_active_mobile: value },
      });
    });
  }

  if (type === "activeEmail") {
    await prisma.$transaction(async (tx) => {
      await tx.user_table.update({
        where: { user_id: userId },
        data: { user_email: value },
      });
    });
  }
};
