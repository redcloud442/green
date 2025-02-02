import { Hono } from "hono";
import {
  emailBatchPostController,
  emailPostController,
} from "./email.controller.js";
import {
  emailBatchPostMiddleware,
  emailPostMiddleware,
} from "./email.middleware.js";

const email = new Hono();

email.post("/", emailPostMiddleware, emailPostController);

email.get("/batch", emailBatchPostMiddleware, emailBatchPostController);

export default email;
