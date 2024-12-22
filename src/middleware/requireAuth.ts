import { NextFunction, Request, Response } from "express";
import { IRequest } from "../type";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { clerkClient } from "@clerk/express";

export async function requireAuth(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.auth!.userId;
    if (!userId) {
      throw new CustomError("Unauthorized", HttpStatusCode.UNAUTHORIZED);
    }
    const user = await clerkClient.users.getUser(userId);
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}
