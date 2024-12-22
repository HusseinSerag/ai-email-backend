import { Response } from "express";
import { HttpStatusCode } from "./customError";

export function sendErrorResponse(
  res: Response,
  message: string,
  code: HttpStatusCode
) {
  res.status(code).json({
    status: "failure",
    message: message,
  });
}

export function sendSuccessResponse(
  res: Response,
  data: Object,
  code: HttpStatusCode
) {
  res.status(code).json({
    status: "success",
    data: data,
  });
}
