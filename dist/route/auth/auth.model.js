import bcrypt from "bcryptjs";
import prisma from "../../utils/prisma.js";
export const loginModel = async (params) => {
    const { userName, password, ip } = params;
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
            alliance_member_table: {
                some: {
                    alliance_member_role: {
                        not: "ADMIN",
                    },
                },
            },
        },
        include: {
            alliance_member_table: true,
        },
    });
    if (!user) {
        throw new Error("Invalid username or password");
    }
    const teamMemberProfile = user.alliance_member_table[0];
    if (!teamMemberProfile)
        throw new Error("User profile not found or incomplete.");
    if (teamMemberProfile.alliance_member_restricted) {
        throw new Error("User is banned.");
    }
    // const comparePassword = await bcrypt.compare(password, user.user_password);
    // if (!comparePassword) {
    //   throw new Error("Password Incorrect");
    // }
    if (teamMemberProfile.alliance_member_restricted ||
        !teamMemberProfile.alliance_member_alliance_id) {
        throw new Error("Access restricted or incomplete profile.");
    }
    await prisma.$transaction([
        prisma.user_history_log.create({
            data: {
                user_ip_address: ip,
                user_history_user_id: user.user_id,
            },
        }),
    ]);
    const redirects = {
        MEMBER: "/",
    };
    const redirect = redirects[teamMemberProfile.alliance_member_role] || "/";
    return redirect;
};
export const loginGetModel = async (userName) => {
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
        },
    });
    const teamMember = await prisma.alliance_member_table.findFirst({
        where: {
            alliance_member_user_id: user?.user_id,
        },
        select: {
            alliance_member_role: true,
            alliance_member_restricted: true,
        },
    });
    if (teamMember?.alliance_member_restricted) {
        throw new Error("User is restricted");
    }
    return user;
};
export const adminModel = async (params) => {
    const { userName, password } = params;
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
            alliance_member_table: {
                some: {
                    alliance_member_role: "ADMIN",
                },
            },
        },
        include: {
            alliance_member_table: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (!user) {
        throw new Error("User is not an admin");
    }
    const teamMember = user.alliance_member_table[0];
    const comparePassword = await bcrypt.compare(password, user.user_password);
    if (!comparePassword) {
        throw new Error("Password incorrect");
    }
    if (!teamMember) {
        throw new Error("User is not an admin");
    }
    return { success: true };
};
export const registerUserModel = async (params) => {
    const { userId, userName, password, firstName, lastName, referalLink, url, activeMobile, activeEmail, ip, botField, } = params;
    if (referalLink) {
        const DEFAULT_ALLIANCE_ID = "35f77cd9-636a-41fa-a346-9cb711e7a338";
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user_table.create({
                data: {
                    user_id: userId,
                    user_password: password,
                    user_first_name: firstName,
                    user_last_name: lastName,
                    user_username: userName,
                    user_active_mobile: activeMobile || "",
                    user_email: activeEmail || "",
                    user_bot_field: botField || "",
                },
            });
            if (!user) {
                throw new Error("Failed to create user");
            }
            const allianceMember = await tx.alliance_member_table.create({
                data: {
                    alliance_member_role: "MEMBER",
                    alliance_member_alliance_id: DEFAULT_ALLIANCE_ID,
                    alliance_member_user_id: userId,
                },
                select: {
                    alliance_member_id: true,
                },
            });
            const referralLinkURL = `${url}/${encodeURIComponent(userName)}`;
            await tx.alliance_referral_link_table.create({
                data: {
                    alliance_referral_link: referralLinkURL,
                    alliance_referral_link_member_id: allianceMember.alliance_member_id,
                },
            });
            await tx.alliance_notification_table.create({
                data: {
                    alliance_notification_user_id: allianceMember.alliance_member_id,
                    alliance_notification_message: `Welcome to Elevate and Congratulations on your free account!`,
                },
            });
            await handleReferral(tx, referalLink, allianceMember.alliance_member_id);
            return {
                success: true,
                user,
            };
        });
    }
    await prisma.user_history_log.create({
        data: {
            user_ip_address: ip,
            user_history_user_id: userId,
        },
    });
};
async function handleReferral(tx, referalLink, allianceMemberId) {
    const referrerData = await tx.$queryRaw `
    SELECT 
        rl.alliance_referral_link_id,
        rt.alliance_referral_hierarchy,
        am.alliance_member_id
      FROM alliance_schema.alliance_referral_link_table rl
      LEFT JOIN alliance_schema.alliance_referral_table rt
        ON rl.alliance_referral_link_member_id = rt.alliance_referral_member_id
      LEFT JOIN alliance_schema.alliance_member_table am
        ON am.alliance_member_id = rl.alliance_referral_link_member_id
      LEFT JOIN user_schema.user_table ut
        ON ut.user_id = am.alliance_member_user_id
      WHERE ut.user_username = ${referalLink}
  `;
    const referrerLinkId = referrerData[0].alliance_referral_link_id;
    const parentHierarchy = referrerData[0].alliance_referral_hierarchy;
    const referrerMemberId = referrerData[0].alliance_member_id;
    const newReferral = await tx.alliance_referral_table.create({
        data: {
            alliance_referral_member_id: allianceMemberId,
            alliance_referral_link_id: referrerLinkId,
            alliance_referral_hierarchy: "",
            alliance_referral_from_member_id: referrerMemberId,
        },
        select: {
            alliance_referral_id: true,
        },
    });
    const newHierarchy = parentHierarchy
        ? `${parentHierarchy}.${allianceMemberId}`
        : `${referrerMemberId}.${allianceMemberId}`;
    await tx.alliance_referral_table.update({
        where: {
            alliance_referral_id: newReferral.alliance_referral_id,
        },
        data: {
            alliance_referral_hierarchy: newHierarchy,
        },
    });
}
