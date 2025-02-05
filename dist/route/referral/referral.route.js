import { Hono } from "hono";
import { referralDirectPostController, referralIndirectPostController, referralTotalGetController, referralUserPostController, } from "./referral.controller.js";
import { referralDirectMiddleware, referralIndirectMiddleware, referralTotalGetMiddleware, referraluserPostMiddleware, } from "./referral.middleware.js";
const referral = new Hono();
referral.get("/", referralTotalGetMiddleware, referralTotalGetController);
referral.post("/", referraluserPostMiddleware, referralUserPostController);
referral.post("/direct", referralDirectMiddleware, referralDirectPostController);
referral.post("/indirect", referralIndirectMiddleware, referralIndirectPostController);
export default referral;
