import { NextFunction, Response, Router } from "express";
import { IRequest } from "../type";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import crypto from "crypto";
import log from "../helpers/logger";
import { prisma } from "../lib/prismaClient";
import { Account } from "../lib/account";
export async function syncEmailWebhook(
  req: IRequest<
    unknown,
    unknown,
    any,
    {
      validationToken: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const validationToken = req.query.validationToken;

    if (validationToken) {
      // **Validation Request**
      console.log("Validation request received:", validationToken);
      res.status(200).send(validationToken);
      return;
    }
    const aurinkoReqTimeStamp = req.headers[
      "x-aurinko-request-timestamp"
    ] as string;
    const signature = req.headers["x-aurinko-signature"] as string;

    if (!aurinkoReqTimeStamp || !signature) {
      throw new CustomError("Bad Request", HttpStatusCode.BAD_REQUEST);
    }
    const body = JSON.parse(req.body);
    const str = `v0:${aurinkoReqTimeStamp}:${req.body.toString("utf-8")}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.AURINKO_SIGNING_SECRET!)
      .update(str)
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new CustomError("Wrong signature!", HttpStatusCode.BAD_REQUEST);
    }

    if (req.body) {
      type AurinkoNotification = {
        subscription: number;
        resource: string;
        accountId: number;
        payloads: {
          id: string;
          changeType: string;
          attributes: {
            threadId: string;
          };
        }[];
      };

      const payload = JSON.parse(req.body) as AurinkoNotification;

      log.info(`Recieved notification: ${payload.accountId} `);
      const account = await prisma.account.findUnique({
        where: {
          id: payload.accountId.toString(),
        },
      });
      if (!account) {
        return new Response("Account not found", { status: 404 });
      }
      const acc = new Account(account.accessToken);
      await acc.syncEmails();
    }
    res.status(200).end(req.query.validationToken);
  } catch (e) {
    //console.log(e);
    next(e);
  }
}
