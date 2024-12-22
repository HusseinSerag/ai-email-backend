import { NextFunction, Response } from "express";
import { IRequest } from "../type";

import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";
import { getAccountAssociatedWithUserService } from "../services/accounts.service";

export async function getAccountsUsers(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.user!;
    const accounts = await getAccountAssociatedWithUserService(id);
    sendSuccessResponse(res, accounts, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}
