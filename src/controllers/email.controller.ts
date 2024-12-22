import { NextFunction, Response } from "express";
import {
  exchangeCodeForAccessToken,
  getAccountDetail,
  getAurinkoAuthURL,
} from "../helpers/aurinko";
import { EmailAttachment, IRequest } from "../type";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";
import { prisma } from "../lib/prismaClient";
import log from "../helpers/logger";

import crypto from "crypto";
import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";
import { Account } from "../lib/account";
import { uploadFilesService } from "../helpers/uploadFileService";
import { SendEmailBody } from "../validation/email";
import { AccountId } from "./../validation/account";
import { sendEmailService } from "../services/emails.service";
import { syncEmailQueue } from "../background/queues";

export function getAurinkoUrl(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  const url = getAurinkoAuthURL("Google", req.user!.id);
  sendSuccessResponse(res, url, HttpStatusCode.OK);
}

export async function sendEmailController(
  req: IRequest<AccountId, unknown, SendEmailBody>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;

    const { id: userId } = req.user!;

    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    const filesUploaded = await uploadFilesService(req.files);

    await sendEmailService(account.accessToken, {
      ...req.body,
      filesUploaded,
    });

    sendSuccessResponse(res, {}, HttpStatusCode.CREATED);
  } catch (e) {
    log.error(e);
    next(e);
  }
}
export async function onboardEmail(
  req: IRequest<
    {},
    {},
    {},
    {
      code: string;
      requestId: string;
      status: string;
      type: string;
      state: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  const frontend = process.env.CLIENT_URL;
  try {
    if (req.query.status != "success") {
      throw new Error();
    } else {
      const code = req.query.code;
      if (!code) throw new Error();
      const { accessToken, accountId } = await exchangeCodeForAccessToken(code);
      const { email, name } = await getAccountDetail(accessToken);

      let userId = JSON.parse(req.query.state);

      // if webhook fails create a user in our DB
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        // create user and use the id
      }
      // if user already have an account with the same address dont create anything
      const account = await prisma.account.findUnique({
        where: {
          emailAddress: email,
        },
        include: {
          users: {
            where: {
              id: userId,
            },
          },
        },
      });

      if (account && account.users.length === 1)
        throw new Error("You are already linked to this account!");
      const foundAcc = await prisma.account.findUnique({
        where: {
          emailAddress: email,
        },
      });
      if (foundAcc) {
        await prisma.account.update({
          where: {
            id: foundAcc.id,
          },
          data: {
            users: {
              connect: {
                id: userId,
              },
            },
          },
        });
      } else {
        // createAccount
        const account = await prisma.account.create({
          data: {
            emailAddress: email,
            accessToken,
            id: accountId.toString(),
            name,
            users: {
              connect: {
                id: userId,
              },
            },
          },
        });
        const customId = crypto.randomUUID().toString();

        syncEmailQueue.add(
          "sync",
          {
            accountId: account.id,
            userId,
          },
          {
            jobId: customId,
          }
        );
      }
    }

    res.redirect(`${frontend}/mail`);
  } catch (e) {
    log.error(e);
    res.redirect(`${frontend}/error?message=${(e as Error).message}`);
  }
}
