import { Hono } from "hono";
import {
  updateWithdrawPostController,
  withdrawBanListDeleteController,
  withdrawBanListGetController,
  withdrawBanListPostController,
  withdrawCashListPostController,
  withdrawCashOutController,
  withdrawCashWithdrawalListExportController,
  withdrawGetController,
  withdrawHistoryPostController,
  withdrawHistoryReportPostController,
  withdrawListPostController,
  withdrawPostController,
  withdrawTotalReportPostController,
} from "./withdraw.controller.js";
import {
  updateWithdrawMiddleware,
  withdrawBanListDeleteMiddleware,
  withdrawBanListGetMiddleware,
  withdrawBanListPostMiddleware,
  withdrawCashOutMiddleware,
  withdrawCashWithdrawalListExportMiddleware,
  withdrawGetMiddleware,
  withdrawHistoryPostMiddleware,
  withdrawHistoryReportPostMiddleware,
  withdrawListPostMiddleware,
  withdrawPostMiddleware,
  withdrawTotalReportPostMiddleware,
} from "./withdraw.middleware.js";

const withdraw = new Hono();

withdraw.post("/", withdrawPostMiddleware, withdrawPostController);

withdraw.post(
  "/cash-withdrawal",
  withdrawCashOutMiddleware,
  withdrawCashOutController
);

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

withdraw.post(
  "/withdraw-cash-list",
  withdrawListPostMiddleware,
  withdrawCashListPostController
);

withdraw.post(
  "/ban-list",
  withdrawBanListPostMiddleware,
  withdrawBanListPostController
);

withdraw.get(
  "/ban-list",
  withdrawBanListGetMiddleware,
  withdrawBanListGetController
);

withdraw.delete(
  "/ban-list/:accountNumber",
  withdrawBanListDeleteMiddleware,
  withdrawBanListDeleteController
);

withdraw.post(
  "/cash-withdrawal-list/export",
  withdrawCashWithdrawalListExportMiddleware,
  withdrawCashWithdrawalListExportController
);

export default withdraw;
