import { NextFunction, Request, Response } from "express";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { Webhook } from "svix";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { prisma } from "../lib/prismaClient";
import log from "../helpers/logger";
import { clerkWebhookService } from "../services/clerk.service";

export async function handleUserCreationWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const SIGNING_SECRET = process.env.SIGNING_SECRET;
    if (!SIGNING_SECRET) {
      throw new CustomError("No signing secret found!", HttpStatusCode.OK);
    }
    const wh = new Webhook(SIGNING_SECRET);
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new CustomError("Missing svix error", HttpStatusCode.BAD_REQUEST);
    }

    await clerkWebhookService(req.body.data);
    log.info("User created!");
    sendSuccessResponse(
      res,
      {
        message: "Webhook recieved",
      },
      HttpStatusCode.OK
    );
  } catch (e) {
    next(e);
  }
}
