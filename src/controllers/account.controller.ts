import { NextFunction, Response } from "express";
import { EmailAddress, EmailAttachment, IRequest } from "../type";
import { prisma } from "../lib/prismaClient";
import { sendSuccessResponse } from "../lib/sendResponse";
import { CustomError, HttpStatusCode } from "../lib/customError";
import { Prisma, Thread } from "@prisma/client";
import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";
import OpenAI from "openai";
import { Account } from "../lib/account";
import { StringValidation } from "zod";
import log from "../lib/logger";
import { appendFileSync } from "fs";
import { UploadToS3, getS3Url } from "../lib/s3";

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
    const inbox: Thread[] = [];
    const draft: Thread[] = [];
    const sent: Thread[] = [];
    threadCount.forEach((thread) => {
      if (thread.draftStatus) {
        draft.push(thread);
      } else if (thread.inboxStatus) {
        inbox.push(thread);
      } else if (thread.sentStatus) {
        sent.push(thread);
      }
    });
    sendSuccessResponse(
      res,
      {
        draft: draft.length,
        sent: sent.length,
        inbox: inbox.length,
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
      tab: "inbox" | "sent" | "draft";
      isDone: "true" | "false";
    }
  >,
  res: Response,
  next: NextFunction
) {
  // filter by inbox, draft, sent
  // filter by done
  try {
    const { id: accountId } = req.params;
    const { tab = "inbox", isDone = false } = req.query;
    const { id: userId } = req.user!;
    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    //new Account(account.accessToken).syncEmails().catch(log.error);
    let filter: Prisma.ThreadWhereInput = {};
    if (tab === "inbox") {
      filter.inboxStatus = true;
    } else if (tab === "draft") {
      filter.draftStatus = true;
    } else if (tab === "sent") {
      filter.sentStatus = true;
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
      take: 15,
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

    sendSuccessResponse(
      res,
      sentThreads,

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

const openAi = new OpenAI({
  apiKey: process.env.OPENAI_SECRET,
});
export async function generateAIemail(
  req: IRequest<
    {},
    {},
    {
      prompt: string;
      context: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const { context, prompt } = req.body;
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const stream = await openAi.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
       You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by providing suggestions and relevant information based on the context of their previous emails.
       
       THE TIME NOW IS ${new Date().toLocaleString()}
      
       
       START CONTEXT BLOCK
       ${context}
       END OF CONTEXT BLOCK
       based on this context, compose an email
       USER PROMPT:
       ${prompt}
       
       When responding, please keep in mind:
       - Be helpful, clever, and articulate. 
       - Rely on the provided email context to inform your response.
       - If the context does not contain enough information to fully address the prompt, politely give a draft response.
       - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
       - Do not invent or speculate about anything that is not directly supported by the email context.
       - Keep your response focused and relevant to the user's prompt.
       - Don't add fluff like 'Heres your email' or 'Here's your email' or anything like that.
       - Directly output the email, no need to say 'Here is your email' or anything like that.
       - No need to output subject
       - no need to output to: email, from: email or subject
       - if user prompt isn't a direct statement, consider that the user want you to autocomplete the text, also autocomplete with either relative information
       or a draft response
       - just output the response
       - the user will provide his/her name, compose the email that this person is sending it
       - return HTML so that the output be displayed nicely
       `,
          },
        ],
        stream: true,
      },
      {}
    );
    for await (const part of stream) {
      if (part.choices[0].finish_reason === "stop") {
        res.end();
        return;
      }

      res.write(part.choices[0].delta.content);
    }
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
    next(e);
  }
}
