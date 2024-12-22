import { NextFunction, Response } from "express";
import { IRequest } from "../type";
import { prisma } from "../lib/prismaClient";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";
import { getAccountAssociatedWithUserService } from "../services/accounts.service";
import { AccountId } from "./../validation/account";

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

export async function getSuggestions(
  req: IRequest<AccountId>,
  res: Response,
  next: NextFunction
) {
  const { id } = req.params;
  try {
    const suggestions = await prisma.emailAddress.findMany({
      where: {
        accountId: id,
      },
      select: {
        id: true,
        name: true,
        address: true,
        raw: true,
      },
    });
    sendSuccessResponse(res, suggestions, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}
