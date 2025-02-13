import { Hono } from "hono";
import {
  depositHistoryPostController,
  depositListPostController,
  depositPostController,
  depositPutController,
  depositReportPostController,
} from "./deposit.controller.js";
import {
  depositHistoryPostMiddleware,
  depositListPostMiddleware,
  depositMiddleware,
  depositPutMiddleware,
  depositReportPostMiddleware,
} from "./deposit.middleware.js";

const deposit = new Hono();

deposit.post("/", depositMiddleware, depositPostController);

deposit.post(
  "/history",
  depositHistoryPostMiddleware,
  depositHistoryPostController
);

deposit.post(
  "/report",
  depositReportPostMiddleware,
  depositReportPostController
);

deposit.put("/:id", depositPutMiddleware, depositPutController);

deposit.post("/list", depositListPostMiddleware, depositListPostController);

export default deposit;
