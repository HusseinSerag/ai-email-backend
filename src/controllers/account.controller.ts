import { NextFunction, Response } from "express";
import { EmailAttachment, IRequest } from "../type";
import { prisma } from "../lib/prismaClient";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";

import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";

import { Account } from "../lib/account";

import log from "../helpers/logger";

import { UploadToS3, getS3Url } from "../lib/s3";

import { getAccountAssociatedWithUserService } from "../services/accounts.service";
import { AccountId } from "./../validation/account";
import { SendEmailBody } from "../validation/email";

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

export async function sendEmailAcc(
  req: IRequest<AccountId, unknown, SendEmailBody>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;

    const { id: userId } = req.user!;
    const {
      body,
      subject,
      bcc,
      cc,
      replyTo,
      threadId,
      to,
      from,
      inReplyTo,
      references,
    } = req.body;

    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    const acc = new Account(account.accessToken);
    const file = req.files as Express.Multer.File[];
    let filesUploaded: Omit<EmailAttachment, "id" | "size">[] = [];
    if (file && file.length > 0) {
      // upload file to s3
      // get back info
      await Promise.all(
        file.map(async (file) => {
          const { fileKey } = await UploadToS3(file);

          filesUploaded.push({
            mimeType: file.mimetype,
            name: file.originalname,
            inline: false,
            contentLocation: getS3Url(fileKey),
            content: file.buffer.toString("base64"),
            contentId: fileKey,
          });
        })
      );
    }

    await acc.sendEmail({
      body,
      subject,
      threadId,
      to: to,
      from: from,
      inReplyTo,
      references,
      bcc: bcc && bcc,
      cc: cc && cc,
      replyTo: replyTo && replyTo,
      attachments: filesUploaded,
    });

    sendSuccessResponse(res, {}, HttpStatusCode.CREATED);
  } catch (e) {
    log.error(e);
    next(e);
  }
}
