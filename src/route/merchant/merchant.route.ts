import { Hono } from "hono";
import {
  merchantBalanceController,
  merchantBankController,
  merchantDeleteController,
  merchantGetController,
  merchantPatchController,
  merchantPostController,
} from "./merchant.controller.js";
import {
  merchantBalanceMiddleware,
  merchantBankMiddleware,
  merchantDeleteMiddleware,
  merchantGetMiddleware,
  merchantPatchMiddleware,
  merchantPostMiddleware,
} from "./merchant.middleware.js";

const merchant = new Hono();

merchant.post("/", merchantPostMiddleware, merchantPostController);

merchant.patch("/", merchantPatchMiddleware, merchantPatchController);

merchant.delete("/", merchantDeleteMiddleware, merchantDeleteController);

merchant.get("/", merchantGetMiddleware, merchantGetController);

merchant.post("/bank", merchantBankMiddleware, merchantBankController);

merchant.post(
  "/balance-history",
  merchantBalanceMiddleware,
  merchantBalanceController
);

export default merchant;
