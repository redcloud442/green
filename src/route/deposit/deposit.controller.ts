import type { Context } from "node:vm";
import { supabaseClient } from "../../utils/supabase.js";
import {
  depositHistoryPostModel,
  depositListPostModel,
  depositPostModel,
  depositPutModel,
  depositReportPostModel,
} from "./deposit.model.js";

export const depositPostController = async (c: Context) => {
  const supabase = supabaseClient;

  const { amount, topUpMode, accountName, accountNumber, publicUrls } =
    c.get("params");

  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    await depositPostModel({
      TopUpFormValues: {
        amount,
        topUpMode,
        accountName,
        accountNumber,
        publicUrls,
      },
      teamMemberProfile: teamMemberProfile,
    });

    return c.json({ message: "Deposit Created" }, { status: 200 });
  } catch (e) {
    publicUrls.forEach(async (url: string) => {
      await supabase.storage.from("REQUEST_ATTACHMENTS").remove([url]);
    });
    console.log(e);
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositPutController = async (c: Context) => {
  try {
    const { status, note, requestId } = c.get("sanitizedData");
    const teamMemberProfile = c.get("teamMemberProfile");

    await depositPutModel({
      status,
      note,
      requestId,
      teamMemberProfile,
    });

    return c.json({ message: "Deposit Updated" }, { status: 200 });
  } catch (e) {
    console.log(e);
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositHistoryPostController = async (c: Context) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await depositHistoryPostModel(params, teamMemberProfile);

    return c.json(data, { status: 200 });
  } catch (e) {
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositListPostController = async (c: Context) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await depositListPostModel(params, teamMemberProfile);

    return c.json(data, { status: 200 });
  } catch (e) {
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositReportPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const data = await depositReportPostModel(params);

    return c.json(data, { status: 200 });
  } catch (e) {
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
