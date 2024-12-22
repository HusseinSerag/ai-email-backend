import { NextFunction, Request, Response } from "express";
import { IRequest } from "../type";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { sendErrorResponse } from "../helpers/sendResponse";
import log from "../helpers/logger";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  log.error(err);
  if (err instanceof CustomError) {
    sendErrorResponse(res, err.message, err.code);
  } else {
    sendErrorResponse(
      res,
      "Something went wrong!",
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }
}
