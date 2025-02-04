import { Hono } from "hono";
import {
  updateWithdrawPostController,
  withdrawGetController,
  withdrawHistoryPostController,
  withdrawHistoryReportPostController,
  withdrawListPostController,
  withdrawPostController,
  withdrawTotalReportPostController,
} from "./withdraw.controller.js";
import {
  updateWithdrawMiddleware,
  withdrawGetMiddleware,
  withdrawHistoryPostMiddleware,
  withdrawHistoryReportPostMiddleware,
  withdrawListPostMiddleware,
  withdrawPostMiddleware,
  withdrawTotalReportPostMiddleware,
} from "./withdraw.middleware.js";

const withdraw = new Hono();

withdraw.post("/", withdrawPostMiddleware, withdrawPostController);

withdraw.get("/", withdrawGetMiddleware, withdrawGetController);

withdraw.post(
  "/history",
  withdrawHistoryPostMiddleware,
  withdrawHistoryPostController
);

withdraw.post(
  "/report",
  withdrawHistoryReportPostMiddleware,
  withdrawHistoryReportPostController
);

withdraw.post(
  "/total-report",
  withdrawTotalReportPostMiddleware,
  withdrawTotalReportPostController
);

withdraw.put("/:id", updateWithdrawMiddleware, updateWithdrawPostController);

withdraw.post("/list", withdrawListPostMiddleware, withdrawListPostController);

export default withdraw;
