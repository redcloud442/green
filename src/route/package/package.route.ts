import { Hono } from "hono";

import {
  packageGetController,
  packagePostController,
  packagesClaimPostController,
  packagesCreatePostController,
  packagesGetAdminController,
  packagesListPostController,
  packagesUpdateFundPostController,
  packagesUpdatePutController,
} from "./package.controller.js";
import {
  packageCreatePostMiddleware,
  packageGetMiddleware,
  packagePostMiddleware,
  packagesClaimPostMiddleware,
  packagesGetListMiddleware,
  packagesUpdateFundPostMiddleware,
  packageUpdatePutMiddleware,
} from "./package.middleware.js";

const packages = new Hono();

packages.post("/", packagePostMiddleware, packagePostController);

packages.get("/", packageGetMiddleware, packageGetController);

packages.put("/:id", packageUpdatePutMiddleware, packagesUpdatePutController);

packages.post("/list", packageGetMiddleware, packagesListPostController);

packages.get("/list", packagesGetListMiddleware, packagesGetAdminController);

packages.post(
  "/create",
  packageCreatePostMiddleware,
  packagesCreatePostController
);

packages.post(
  "/claim",
  packagesClaimPostMiddleware,
  packagesClaimPostController
);

packages.patch(
  "/update-funds",
  packagesUpdateFundPostMiddleware,
  packagesUpdateFundPostController
);

export default packages;
