import { NextFunction, Request, Response } from "express";
import { CustomError, HttpStatusCode } from "../lib/customError";
import { Webhook } from "svix";
import { sendSuccessResponse } from "../lib/sendResponse";
import { prisma } from "../lib/prismaClient";
import log from "../lib/logger";

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

    const data = req.body.data;
    const { first_name, last_name, image_url, email_addresses, id } = data;
    await prisma.user.create({
      data: {
        firstName: first_name ?? email_addresses[0].email_address,
        email: email_addresses[0].email_address,
        lastName: last_name ?? email_addresses[0].email_addres,
        imageUrl: image_url,
        id: id,
      },
    });
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
