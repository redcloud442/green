import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  referralDirectModelPost,
  referralIndirectModelPost,
  referralTotalGetModel,
  referralUserModelPost,
} from "./referral.model.js";

export const referralDirectPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await referralDirectModelPost({
      ...params,
      teamMemberProfile,
    });

    return c.json(data, 200);
  } catch (error) {
    console.log(error);
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const referralUserPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const data = await referralUserModelPost({
      ...params,
    });

    return c.json(data, 200);
  } catch (error) {
    console.log(error);
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const referralIndirectPostController = async (c: Context) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await referralIndirectModelPost({
      ...params,
      teamMemberProfile,
    });

    return c.json(data);
  } catch (error) {
    console.log(error);
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const referralTotalGetController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const { data } = await referralTotalGetModel({ teamMemberProfile });

    return c.json({ message: "Data fetched successfully", data });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
