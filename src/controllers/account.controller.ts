import { NextFunction, Response } from "express";
import { EmailAddress, EmailAttachment, IRequest } from "../type";
import { prisma } from "../lib/prismaClient";
import { sendSuccessResponse } from "../lib/sendResponse";
import { CustomError, HttpStatusCode } from "../lib/customError";
import { Prisma, Thread } from "@prisma/client";
import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";

import { Account } from "../lib/account";

import log from "../lib/logger";

import { UploadToS3, getS3Url } from "../lib/s3";
import { OramaClient } from "../lib/orama";

import { generateEmail } from "../services/ai.service";

export async function getAccountsUsers(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.user!;
    const accounts = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        account: {
          select: {
            emailAddress: true,
            id: true,
            name: true,
            isSyncedInitially: true,
          },
        },
      },
    });
    if (!accounts)
      throw new CustomError("User does not exist", HttpStatusCode.NOT_FOUND);
    sendSuccessResponse(res, accounts.account, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}

export async function getThreadCountAccounts(
  req: IRequest<{
    id: string;
  }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;
    const { id: userId } = req.user!;
    await getAccountAssociatedWithUser({
      accountId,
      userId,
    });

    const threadCount = await prisma.thread.findMany({
      where: {
        accountId,
      },
    });
    const stats = await Promise.all([
      prisma.thread.count({
        where: {
          accountId,
          draftStatus: true,
        },
      }),
      prisma.thread.count({
        where: {
          accountId,
          inboxStatus: true,
        },
      }),
      prisma.thread.count({
        where: {
          accountId,
          sentStatus: true,
        },
      }),
      prisma.thread.count({
        where: {
          accountId,
          starred: true,
        },
      }),
    ]);

    sendSuccessResponse(
      res,
      {
        draft: stats[0],
        inbox: stats[1],
        sent: stats[2],
        starred: stats[3],
      },
      HttpStatusCode.OK
    );
  } catch (e) {
    next(e);
  }
}

export async function getThreadsAccount(
  req: IRequest<
    {
      id: string;
    },
    {},
    {},
    {
      tab: "inbox" | "sent" | "draft" | "starred" | "archived";
      isDone: "true" | "false";
      page: number;
      offset: number;
    }
  >,
  res: Response,
  next: NextFunction
) {
  // filter by inbox, draft, sent
  // filter by done
  try {
    const { id: accountId } = req.params;
    const { tab = "inbox", isDone = false, offset = 10, page = 0 } = req.query;
    const { id: userId } = req.user!;

    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    let filter: Prisma.ThreadWhereInput = {};
    if (tab === "inbox") {
      filter.inboxStatus = true;
      filter.archived = false;
    } else if (tab === "draft") {
      filter.draftStatus = true;
      filter.archived = false;
    } else if (tab === "sent") {
      filter.sentStatus = true;
      filter.archived = false;
    } else if (tab === "starred") {
      filter.starred = true;
      filter.archived = false;
    } else if (tab === "archived") {
      filter.archived = true;
    }
    filter.done = {
      equals: isDone === "true" ? true : false,
    };
    filter.accountId = account.id;
    const threads = await prisma.thread.findMany({
      where: filter,
      include: {
        emails: {
          orderBy: {
            sentAt: "asc",
          },
          select: {
            from: true,
            body: true,
            bodySnippet: true,
            emailLabel: true,
            subject: true,
            sentAt: true,
            id: true,
            sysLabels: true,
            to: true,
            replyTo: true,
            cc: true,
            attachments: true,
          },
        },
      },
      skip: +offset * +page,
      take: +offset,

      orderBy: {
        lastMessageDate: "desc",
      },
    });

    let sentThreads = threads.filter((thread) => thread.emails.length > 0);

    sentThreads.forEach((threads) =>
      threads.emails.forEach((email) =>
        email.attachments.forEach((attachment) => {
          if (attachment.contentId?.startsWith("uploads/")) {
            attachment.contentLocation = getS3Url(attachment.contentId);
          }
        })
      )
    );

    const totalCount = await prisma.thread.count({ where: filter });
    const totalPages = Math.ceil(totalCount / offset);

    const response = {
      data: sentThreads,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
    sendSuccessResponse(
      res,
      response,

      HttpStatusCode.OK
    );
  } catch (e) {
    next(e);
  }
}

export async function getSuggestions(
  req: IRequest<{
    id: string;
  }>,
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
  req: IRequest<
    {
      id: string;
    },
    {},
    {
      body: string;
      subject: string;
      threadId?: string;
      to: EmailAddress[];
      from: EmailAddress;
      references?: string;
      inReplyTo?: string;
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: EmailAddress[];
    }
  >,
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
      to: JSON.parse(to as any),
      from: JSON.parse(from as any),
      inReplyTo,
      references,
      bcc: bcc && JSON.parse(bcc as any),
      cc: cc && JSON.parse(cc as any),
      replyTo: replyTo && JSON.parse(replyTo as any),
      attachments: filesUploaded,
    });

    sendSuccessResponse(res, {}, HttpStatusCode.CREATED);
  } catch (e) {
    log.error(e);
    next(e);
  }
}

export async function searchThreads(
  req: IRequest<
    {
      id: string;
    },
    {},
    {},
    {
      query: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;

    const { id: userId } = req.user!;
    const { query } = req.query;

    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    const orama = new OramaClient(account.id);
    await orama.init();
    const resp = await orama.search({
      term: query,
    });
    let response = resp.hits.map((hit) => hit.document);

    sendSuccessResponse(res, response, HttpStatusCode.CREATED);
  } catch (e) {
    next(e);
  }
}
