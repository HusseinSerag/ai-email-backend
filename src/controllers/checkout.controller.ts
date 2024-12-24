import { NextFunction, Response } from "express";
import { CustomError, HttpStatusCode } from "../helpers/customError";

import { sendSuccessResponse } from "../helpers/sendResponse";

import log from "../helpers/logger";
import { IRequest } from "../type";
import { createCheckoutSessionService } from "../services/checkout.service";

export async function createCheckoutSessionController(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: userId } = req.user!;
    const url = await createCheckoutSessionService(userId);
    sendSuccessResponse(res, url, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}
