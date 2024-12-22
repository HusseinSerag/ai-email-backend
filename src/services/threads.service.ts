import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { getS3Url } from "../lib/s3";

import { OramaClient } from "../lib/orama";
import { Done, Tab } from "../validation/threads";
import { CustomError, HttpStatusCode } from "../helpers/customError";

export async function threadStatsService(accountId: string) {
  try {
    return await Promise.all([
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
  } catch (e) {
    throw e;
  }
}

export async function getThreadsService(
  accountId: string,
  tab: Tab,
  isDone: Done,
  offset: number,
  page: number
) {
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
    equals: isDone === "done",
  };
  filter.accountId = accountId;
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

  return {
    totalCount,
    totalPages,
    sentThreads,
  };
}

export async function searchThreadService(accountId: string, query: string) {
  try {
    const orama = new OramaClient(accountId);
    await orama.init();
    const resp = await orama.search({
      term: query,
    });
    return resp.hits.map((hit) => hit.document);
  } catch (e) {
    throw e;
  }
}

export async function getThreadService(accountId: string, threadId: string) {
  try {
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        accountId: accountId,
      },
      include: {
        emails: {
          orderBy: { sentAt: "asc" },
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
    });

    if (!thread)
      throw new CustomError("Thread doesn't exist", HttpStatusCode.NOT_FOUND);
    return thread;
  } catch (e) {
    throw e;
  }
}

export async function toggleStarService(threadId: string) {
  try {
    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
    });
    if (!thread)
      throw new CustomError("Thread doesnt exist", HttpStatusCode.NOT_FOUND);
    const t = await prisma.thread.update({
      where: {
        id: threadId,
      },
      data: {
        starred: !thread.starred,
      },
    });
    return t;
  } catch (e) {
    throw e;
  }
}

export async function toggleArchiveService(threadId: string) {
  try {
    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
    });
    if (!thread)
      throw new CustomError("Thread doesnt exist", HttpStatusCode.NOT_FOUND);
    const t = await prisma.thread.update({
      where: {
        id: threadId,
      },
      data: {
        archived: !thread.archived,
      },
    });
    return t;
  } catch (e) {
    throw e;
  }
}

export async function getThreadInfoService(
  account: {
    emailAddress: string;
    name: string;
  },
  threadId: string
) {
  try {
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
    return valueReturned;
  } catch (e) {
    throw e;
  }
}