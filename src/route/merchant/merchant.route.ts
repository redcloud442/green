import { Hono } from "hono";
import {
  merchantBankController,
  merchantDeleteController,
  merchantGetController,
  merchantPatchController,
  merchantPostController,
} from "./merchant.controller.js";
import {
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

export default merchant;
