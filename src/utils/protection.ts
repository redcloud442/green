import type { alliance_member_table, PrismaClient } from "@prisma/client";
import { sendErrorResponse } from "./function.js";

export const protectionMemberUser = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        user_username: true,
        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      ![
        "MEMBER",
        "MERCHANT",
        "ACCOUNTING",
        "ADMIN",
        "CLIENT",
        "ACCOUNTING_HEAD",
      ].includes(user.alliance_member_table[0].alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
      user: user,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionMerchantAdmin = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,

        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
            alliance_member_alliance_id: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !["MERCHANT", "ADMIN"].includes(
        user.alliance_member_table[0].alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAccountingAdmin = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,

        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
            alliance_member_alliance_id: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !["ACCOUNTING", "ACCOUNTING_HEAD", "ADMIN"].includes(
        user.alliance_member_table[0].alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAdmin = async (userId: string, prisma: PrismaClient) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,

        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
            alliance_member_alliance_id: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !["ADMIN"].includes(user.alliance_member_table[0].alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAccountingMerchantAdmin = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,

        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
            alliance_member_alliance_id: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !["ADMIN", "ACCOUNTING", "ACCOUNTING_HEAD", "MERCHANT"].includes(
        user.alliance_member_table[0].alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionClient = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        alliance_member_table: {
          select: {
            alliance_member_id: true,
            alliance_member_role: true,
            alliance_member_restricted: true,
            alliance_member_is_active: true,
          },
        },
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !["CLIENT"].includes(user.alliance_member_table[0].alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
