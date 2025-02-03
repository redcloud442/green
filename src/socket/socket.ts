import { Socket, Server as SocketIOServer } from "socket.io";
import { initializeSupabaseForSocket } from "../middleware/auth.middleware.js";
import { protectionMemberUser } from "../utils/protection.js";

import {
  notificationGetModel,
  updateNotificationModel,
} from "../route/notification/notification.model.js";
import prisma from "../utils/prisma.js";
import redis from "../utils/redis.js";

const RATE_LIMIT = 10;
const TIME_WINDOW = 60;

const isRateLimited = async (userId: string): Promise<boolean> => {
  const redisKey = `rate_limit:${userId}`;

  // Increment the user's request count and get the new value
  const requestCount = await redis.incr(redisKey);

  if (requestCount === 1) {
    // First request: Set expiration time for the key
    await redis.expire(redisKey, TIME_WINDOW);
  }

  return requestCount > RATE_LIMIT;
};

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
    socket.on("join-room", async ({ teamMemberId }) => {
      if (await isRateLimited(teamMemberId)) {
        socket.emit("rate-limit-exceeded", {
          message: "Rate limit exceeded. Try again later.",
        });
        return;
      }
      socket.join(`room-${teamMemberId}`);
    });

    socket.on("get-notification", async (data) => {
      if (await isRateLimited(data.teamMemberId)) {
        socket.emit("rate-limit-exceeded", {
          message: "Rate limit exceeded. Try again later.",
        });
        return;
      }
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
      if (await isRateLimited(teamMemberId)) {
        socket.emit("rate-limit-exceeded", {
          message: "Rate limit exceeded. Try again later.",
        });
        return;
      }
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
