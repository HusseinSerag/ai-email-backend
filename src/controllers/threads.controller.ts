import { NextFunction, Response } from "express";
import { IRequest } from "../type";
import { prisma } from "../lib/prismaClient";
import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";
import { sendSuccessResponse } from "../lib/sendResponse";
import { CustomError, HttpStatusCode } from "../lib/customError";
import { writeFileSync } from "fs";
import { transformDocument } from "@prisma/client/runtime";

export async function getThreadInformation(
  req: IRequest<{
    id: string;
    threadId: string;
  }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId, threadId } = req.params;
    const { id: userId } = req.user!;
    const account = await getAccountAssociatedWithUser({
      accountId,
      userId,
    });
    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        emails: {
          orderBy: { sentAt: "asc" },
          select: {
            from: true,
            to: true,
            cc: true,
            bcc: true,
            sentAt: true,
            subject: true,
            internetMessageId: true,
            replyTo: true,
            references: true,
          },
        },
      },
    });

    if (!thread)
      throw new CustomError("Thread doesn't exist", HttpStatusCode.NOT_FOUND);
    ////
    console.log("here");
    let lastExternalEmail = thread.emails
      .reverse()
      .find((email) => email.from.address !== account.emailAddress);
    let fromMe = !!lastExternalEmail;
    if (!lastExternalEmail) {
      lastExternalEmail = thread.emails.reverse()[0];
    }
    const valueReturned = {
      subject: lastExternalEmail.subject,
      to: [
        fromMe && lastExternalEmail.from,
        ...lastExternalEmail.to.filter(
          (to) => to.address !== account.emailAddress
        ),
      ].filter(Boolean),
      cc: [
        ...lastExternalEmail.cc,
        ...lastExternalEmail.cc.filter(
          (cc) => cc.address !== account.emailAddress
        ),
      ],
      from: {
        name: account.name,
        address: account.emailAddress,
      },
      id: lastExternalEmail.internetMessageId,
      replyTo: lastExternalEmail.replyTo,
      references: lastExternalEmail.references,
    };
    sendSuccessResponse(res, valueReturned, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}
