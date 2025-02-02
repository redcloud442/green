import { Socket, Server as SocketIOServer } from "socket.io";
import { initializeSupabaseForSocket } from "../middleware/auth.middleware.js";
import { protectionMemberUser } from "../utils/protection.js";

import {
  notificationGetModel,
  updateNotificationModel,
} from "../route/notification/notification.model.js";
import prisma from "../utils/prisma.js";

const socketMiddleware = async (socket: Socket, next: any) => {
  try {
    const supabase = initializeSupabaseForSocket(socket);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Authentication error: Invalid or missing user ID");
    }

    const teamMemberProfile = await protectionMemberUser(data.user.id, prisma);
    if (!teamMemberProfile) {
      throw new Error("Authentication error: Unauthorized team member");
    }

    socket.data.teamMemberProfile = teamMemberProfile;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

export function initializeSocketFunctions(io: SocketIOServer) {
  io.use(socketMiddleware);

  io.on("connection", (socket: Socket) => {
    socket.on("join-room", ({ teamMemberId }) => {
      socket.join(`room-${teamMemberId}`);
    });

    socket.on("get-notification", async (data) => {
      try {
        const { notifications, count } = await notificationGetModel({
          teamMemberId: data.teamMemberId,
          take: data.take || 10,
        });

        io.to(`room-${data.teamMemberId}`).emit("notification-update", {
          notifications: notifications || [],
          count: count || 0,
        });
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    });

    socket.on("update-notification", async ({ teamMemberId, take }) => {
      try {
        setTimeout(async () => {
          const notifications = await updateNotificationModel({
            teamMemberId: teamMemberId,
            take: take || 10,
          });

          io.to(`room-${teamMemberId}`).emit("notification-update", {
            notifications: notifications || [],
            count: 0,
          });
        }, 2000);
      } catch (error) {
        console.error("Error handling update-notification:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
