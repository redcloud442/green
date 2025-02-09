import io from "../../index.js";
import prisma from "../../utils/prisma.js";
export const chatSessionPostModel = async (params) => {
    const { page, limit } = params;
    const sessions = await prisma.chat_session_table.findMany({
        where: {
            chat_session_status: "WAITING FOR SUPPORT",
        },
        include: {
            alliance_member_table: {
                select: {
                    alliance_member_id: true,
                    alliance_member_user_id: true,
                },
            },
        },
        orderBy: {
            chat_session_date: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
    });
    const getUserId = sessions.map((session) => session.alliance_member_table?.alliance_member_user_id);
    const getUserName = await prisma.user_table.findMany({
        where: {
            user_id: {
                in: getUserId,
            },
        },
    });
    const getUserData = getUserId.map((id) => {
        const user = getUserName.find((user) => user.user_id === id);
        return {
            user_id: id,
            user_username: user?.user_username,
            ...sessions.find((session) => session.alliance_member_table?.alliance_member_user_id === id),
        };
    });
    const totalCount = await prisma.chat_session_table.count({
        where: {
            chat_session_status: "WAITING FOR SUPPORT",
        },
    });
    return { data: getUserData, totalCount };
};
export const chatSessionPostModelAdmin = async () => {
    const sessions = await prisma.chat_session_table.findMany({
        where: {
            chat_session_status: "WAITING FOR SUPPORT",
        },
        include: {
            alliance_member_table: {
                select: {
                    alliance_member_id: true,
                    alliance_member_user_id: true,
                },
            },
        },
        orderBy: {
            chat_session_date: "desc",
        },
    });
    const getUserId = sessions.map((session) => session.alliance_member_table?.alliance_member_user_id);
    const getUserName = await prisma.user_table.findMany({
        where: {
            user_id: {
                in: getUserId,
            },
        },
    });
    const getUserData = getUserId.map((id) => {
        const user = getUserName.find((user) => user.user_id === id);
        return {
            user_id: id,
            user_username: user?.user_username,
            ...sessions.find((session) => session.alliance_member_table?.alliance_member_user_id === id),
        };
    });
    const totalCount = await prisma.chat_session_table.count({
        where: {
            chat_session_status: "WAITING FOR SUPPORT",
        },
    });
    return { data: getUserData, totalCount };
};
export const chatSessionPutModel = async (params, teamMemberProfile) => {
    const { sessionId } = params;
    const { alliance_member_id, alliance_member_alliance_id } = teamMemberProfile;
    prisma.$transaction(async (tx) => {
        const session = await tx.chat_session_table.findUnique({
            where: {
                chat_session_id: sessionId,
            },
        });
        if (!session) {
            throw new Error("Session not found");
        }
        if (session.chat_session_status !== "WAITING FOR SUPPORT") {
            throw new Error("Session is not in waiting for support");
        }
        await tx.chat_session_table.update({
            where: {
                chat_session_id: sessionId,
            },
            data: {
                chat_session_status: "SUPPORT ONGOING",
                chat_session_support_id: alliance_member_id,
            },
        });
        io.to(alliance_member_alliance_id).emit("supportSessionAccepted", {
            sessionId,
        });
    });
};
export const chatSessionGetMessageModel = async (teamMemberProfile) => {
    const { alliance_member_id } = teamMemberProfile;
    const data = await prisma.$queryRaw `
    SELECT 
      chat_session_id,
      chat_session_status,
      chat_session_date,
      user_username
  FROM chat_schema.chat_session_table
  JOIN alliance_schema.alliance_member_table ON chat_session_alliance_member_id = alliance_member_id
  JOIN user_schema.user_table ON alliance_member_user_id = user_id
  WHERE chat_session_support_id = ${alliance_member_id}::uuid AND chat_session_status != 'SUPPORT ONGOING'
  ORDER BY chat_session_date DESC;

  `;
    const totalCount = await prisma.chat_session_table.count({
        where: {
            chat_session_support_id: alliance_member_id,
            chat_session_status: "WAITING FOR SUPPORT",
        },
    });
    return { data, totalCount };
};
export const chatRequestSessionModel = async (teamMemberProfile) => {
    const { alliance_member_id } = teamMemberProfile;
    await prisma.$transaction(async (tx) => {
        await tx.chat_session_table.create({
            data: {
                chat_session_status: "WAITING FOR SUPPORT",
                chat_session_alliance_member_id: alliance_member_id,
            },
        });
    });
    return { message: "Session created" };
};
export const chatSessionGetMessageIdModel = async (params) => {
    const { id } = params;
    console.log(id);
    const message = await prisma.chat_message_table.findMany({
        where: {
            chat_message_session_id: id,
        },
    });
    return message;
};
