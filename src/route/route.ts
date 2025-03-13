import { Hono } from "hono";
import { protectionMiddleware } from "../middleware/protection.middleware.js";
import { redis } from "../utils/redis.js";
import auth from "./auth/auth.route.js";
import dashboard from "./dashboard/dashboard.route.js";
import deposit from "./deposit/deposit.route.js";
import email from "./email/email.route.js";
import health from "./health/health.route.js";
import leaderboard from "./leaderboard/leaderboard.route.js";
import merchant from "./merchant/merchant.route.js";
import messaging from "./messaging/messaging.route.js";
import mission from "./mission/mission.route.js";
import { notificationPostPackageModel } from "./notification/notification.model.js";
import notification from "./notification/notification.route.js";
import options from "./options/options.route.js";
import packages from "./package/package.route.js";
import referral from "./referral/referral.route.js";
import transaction from "./transaction/transaction.route.js";
import user from "./user/user.route.js";
import withdraw from "./withdraw/withdraw.route.js";

const app = new Hono();

//auth route
app.route("/auth", auth);

//health route
app.route("/health", health);

//deposit route
app.use("/deposit/*", protectionMiddleware);
app.route("/deposit", deposit);

//user route
app.use("/user/*", protectionMiddleware);
app.route("/user", user);

//transaction route
app.use("/transaction/*", protectionMiddleware);
app.route("/transaction", transaction);

//referral route
app.use("/referral/*", protectionMiddleware);
app.route("/referral", referral);

//package route
app.use("/package/*", protectionMiddleware);
app.route("/package", packages);

//merchant route
app.use("/merchant/*", protectionMiddleware);
app.route("/merchant", merchant);

//withdraw route
app.use("/withdraw/*", protectionMiddleware);
app.route("/withdraw", withdraw);

//dashboard route
app.use("/dashboard/*", protectionMiddleware);
app.route("/dashboard", dashboard);

//leaderboard route
app.use("/leaderboard/*", protectionMiddleware);
app.route("/leaderboard", leaderboard);

//options route
app.use("/options/*", protectionMiddleware);
app.route("/options", options);

//messaging route
app.use("/messaging/*", protectionMiddleware);
app.route("/messaging", messaging);

//email route
app.use("/email/*", protectionMiddleware);
app.route("/email", email);

//notification route
app.use("/notification/*", protectionMiddleware);
app.route("/notification", notification);

//mission route
app.use("/mission/*", protectionMiddleware);
app.route("/mission", mission);

app.get("/", (c) => {
  return c.html(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>API Status</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  text-align: center;
                  padding: 50px;
                }
                .status {
                  font-size: 20px;
                  color: green;
                }
              </style>
          </head>
          <body>
              <h1>API Status</h1>
              <p class="status">✅ API Routes is working perfectly!</p>
              <p>Current Time: ${new Date().toLocaleString()}</p>
          </body>
          </html>
        `);
});

export const generateRandomAmounts = async (): Promise<number[]> => {
  try {
    const [startAmount, endAmount] = await Promise.all([
      redis.get("startAmount") as Promise<string>,
      redis.get("endAmount") as Promise<string>,
    ]);

    const min = startAmount ? parseInt(startAmount) : 300;
    const max = endAmount ? parseInt(endAmount) : 1000;

    if (isNaN(min) || isNaN(max) || min >= max) {
      console.error("Invalid amount range in Redis");
      return [];
    }

    const highMin = 5000;
    const highMax = 20000;

    const useHighRange = Math.random() < 0.8;

    const chosenMin = useHighRange ? highMin : min;
    const chosenMax = useHighRange ? highMax : max;

    const randomAmount =
      Math.floor(Math.random() * (chosenMax - chosenMin + 1)) + chosenMin;

    return [randomAmount];
  } catch (error) {
    console.error("Error generating random amount:", error);
    return [];
  }
};

setInterval(async () => {
  const LOCK_KEY = "notification_lock";
  const LOCK_EXPIRY = 60;
  const uniqueLockValue = crypto.randomUUID();
  try {
    const lockAcquired = await redis.set(LOCK_KEY, uniqueLockValue, {
      nx: true,
      ex: LOCK_EXPIRY,
    });
    if (lockAcquired !== "OK") {
      console.log("Another server is handling the job. Skipping...");
      return;
    }

    // Generate amounts
    const randomAmounts = await generateRandomAmounts();
    if (randomAmounts.length > 0) {
      const packageData = { package_name: "PEAK" };
      await notificationPostPackageModel({
        amount: randomAmounts,
        packageData,
      });
      console.log("Notification inserted successfully!");
    } else {
      console.log("Skipping insert: No valid random amounts generated.");
    }
  } catch (error) {
    console.error("Error processing notification:", error);
  } finally {
    const currentLockValue = await redis.get(LOCK_KEY);
    if (currentLockValue === uniqueLockValue) {
      await redis.del(LOCK_KEY);
      console.log("Lock released by this server.");
    }
  }
}, 60000);

export default app;
