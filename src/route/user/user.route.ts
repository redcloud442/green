import { Hono } from "hono";
import {
  userActiveListController,
  userChangePasswordController,
  userGenerateLinkController,
  userGetController,
  userListController,
  userListReinvestedController,
  userPatchController,
  userPostController,
  userPreferredBankController,
  userProfileDataPutController,
  userProfilePutController,
  userPutController,
  userSponsorController,
} from "./user.controller.js";
import {
  userActiveListMiddleware,
  userChangePasswordMiddleware,
  userGenerateLinkMiddleware,
  userGetMiddleware,
  userListMiddleware,
  userListReinvestedMiddleware,
  userPatchMiddleware,
  userPostMiddleware,
  userPreferredBankMiddleware,
  userProfileDataPutMiddleware,
  userProfilePutMiddleware,
  userPutMiddleware,
  userSponsorMiddleware,
} from "./user.middleware.js";

const user = new Hono();

user.post("/", userPostMiddleware, userPostController);

user.put("/", userPutMiddleware, userPutController);

user.get("/", userGetMiddleware, userGetController);

user.patch("/:id", userPatchMiddleware, userPatchController);

user.put("/:id", userProfilePutMiddleware, userProfilePutController);

user.put(
  "/:id/update-profile",
  userProfileDataPutMiddleware,
  userProfileDataPutController
);

user.put(
  "/:id/change-password",
  userChangePasswordMiddleware,
  userChangePasswordController
);

user.post(
  "/generate-link",
  userGenerateLinkMiddleware,
  userGenerateLinkController
);

user.post("/sponsor", userSponsorMiddleware, userSponsorController);

user.post("/list", userListMiddleware, userListController);

user.post(
  "/list/reinvested",
  userListReinvestedMiddleware,
  userListReinvestedController
);

user.post("/active-list", userActiveListMiddleware, userActiveListController);

user.post(
  "/preferred-bank",
  userPreferredBankMiddleware,
  userPreferredBankController
);

export default user;
