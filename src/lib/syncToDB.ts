import { EmailAddress, EmailMessage, EmailAttachment } from "../type";
import log from "../helpers/logger";
import p from "p-limit";
import { prisma } from "./prismaClient";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { eventQueue } from "./bullMQ";
import axios from "axios";
import { UploadToS3, getS3Url } from "./s3";
import { OramaClient } from "./orama";

import { turndown } from "../helpers/turndown";
import { generateEmbeddings } from "../helpers/analyzeEmail";

export async function syncEmailsToDB(
  emails: EmailMessage[],
  accountId: string,
  userId?: string,
  jobId?: string
) {
  log.info("Attempting sync emails");
  const limit = p(5);
  const orama = new OramaClient(accountId);
  await orama.init();
  try {
    let index = 0;
    if (userId && jobId) {
      eventQueue.emit(
        "progress",
        {
          data: {
            done: index,
            total: emails.length,
            userId,
            accountId,
          },
          jobId,
        },
        jobId
      );
    }

    for (const email of emails) {
      await upsertEmail(email, accountId, index++);
      const turnedDownBody = turndown.turndown(
        email.body ?? email.bodySnippet ?? ""
      );
      const embeddings = await generateEmbeddings(turnedDownBody);
      await orama.insert({
        subject: email.subject,
        body: turnedDownBody,
        from: email.from.address,
        to: email.to.map((t) => t.address),
        sentAt: email.sentAt,
        threadId: email.threadId,
        rawBody: email.bodySnippet ?? "",
        embeddings: embeddings,
      });
      await orama.saveIndex();
      if (jobId && userId) {
        eventQueue.emit(
          "progress",
          {
            data: {
              done: index,
              total: emails.length,
              userId,
              accountId,
            },
            jobId,
          },
          jobId
        );
      }
    }
  } catch (e) {
    log.error(e);
    throw e;
  }
}

async function upsertEmail(
  email: EmailMessage,
  accountId: string,
  index: number
) {
  log.info(`Upserting email number ${index}`);
  try {
    let emailLabelType: "inbox" | "sent" | "draft" = "inbox";
    if (
      email.sysLabels.includes("important") ||
      email.sysLabels.includes("inbox")
    ) {
      emailLabelType = "inbox";
    } else if (email.sysLabels.includes("draft")) {
      emailLabelType = "draft";
    } else if (email.sysLabels.includes("sent")) {
      emailLabelType = "sent";
    }

    const addressesToUpsert = new Map();
    for (const address of [
      email.from,
      ...email.to,
      ...email.cc,
      ...email.bcc,
      ...email.replyTo,
    ]) {
      addressesToUpsert.set(address.address, address);
    }
    let upsertedAddresses: Awaited<ReturnType<typeof upsertEmailAddress>>[] =
      [];
    for (const address of addressesToUpsert.values()) {
      upsertedAddresses.push(await upsertEmailAddress(address, accountId));
    }

    const addressMap = new Map(
      upsertedAddresses
        .filter(Boolean)
        .map((address) => [address!.address, address])
    );

    const fromAddress = addressMap.get(email.from.address);

    if (!fromAddress) {
      throw new CustomError("Address not found!", HttpStatusCode.BAD_REQUEST);
    }
    const toAddress = email.to
      .map((address) => addressMap.get(address.address))
      .filter(Boolean);
    const ccAddress = email.cc
      .map((address) => addressMap.get(address.address))
      .filter(Boolean);
    const bccAddress = email.bcc
      .map((address) => addressMap.get(address.address))
      .filter(Boolean);
    const replyToAddress = email.replyTo
      .map((address) => addressMap.get(address.address))
      .filter(Boolean);

    // insert threads

    const thread = await prisma.thread.upsert({
      where: {
        id: email.threadId,
      },
      update: {
        subject: email?.subject || "",
        accountId,
        lastMessageDate: new Date(email.sentAt),
        done: false,
        participantIds: [
          ...new Set([
            fromAddress.id,
            ...toAddress.map((m) => m!.id),
            ...ccAddress.map((m) => m!.id),
            ...bccAddress.map((m) => m!.id),
          ]),
        ],
      },
      create: {
        id: email.threadId,
        accountId,
        subject: email?.subject || "",
        done: false,
        draftStatus: emailLabelType === "draft",
        inboxStatus: emailLabelType === "inbox",
        sentStatus: emailLabelType === "sent",
        starred: email.sysLabels.includes("important"),
        lastMessageDate: new Date(email.sentAt),
        participantIds: [
          ...new Set([
            fromAddress.id,
            ...toAddress.map((a) => a!.id),
            ...ccAddress.map((a) => a!.id),
            ...bccAddress.map((a) => a!.id),
          ]),
        ],
      },
    });
    await prisma.email.upsert({
      where: { id: email.id },
      update: {
        threadId: thread.id,
        createdTime: new Date(email.createdTime),
        lastModifiedTime: new Date(),
        sentAt: new Date(email.sentAt),
        receivedAt: new Date(email.receivedAt),
        internetMessageId: email.internetMessageId,
        subject: email?.subject || "",
        sysLabels: email.sysLabels,
        keywords: email.keywords,
        sysClassifications: email.sysClassifications,
        sensitivity: email.sensitivity,
        meetingMessageMethod: email.meetingMessageMethod,
        fromId: fromAddress.id,
        to: { set: toAddress.map((a) => ({ id: a!.id })) },
        cc: { set: ccAddress.map((a) => ({ id: a!.id })) },
        bcc: { set: bccAddress.map((a) => ({ id: a!.id })) },
        replyTo: { set: replyToAddress.map((a) => ({ id: a!.id })) },
        hasAttachments: email.hasAttachments,
        internetHeaders: [JSON.stringify(email.internetHeaders)],
        body: email.body,
        bodySnippet: email.bodySnippet,
        inReplyTo: email.inReplyTo,
        references: email.references,
        threadIndex: email.threadIndex,
        nativeProperties: email.nativeProperties as any,
        folderId: email.folderId,
        omitted: email.omitted,
        emailLabel: emailLabelType,
      },
      create: {
        id: email.id,
        emailLabel: emailLabelType,
        threadId: thread.id,
        createdTime: new Date(email.createdTime),
        lastModifiedTime: new Date(),
        sentAt: new Date(email.sentAt),
        receivedAt: new Date(email.receivedAt),
        internetMessageId: email.internetMessageId,
        subject: email?.subject || "",
        sysLabels: email.sysLabels,
        internetHeaders: [JSON.stringify(email.internetHeaders) as any],
        keywords: email.keywords,
        sysClassifications: email.sysClassifications,
        sensitivity: email.sensitivity,
        meetingMessageMethod: email.meetingMessageMethod,
        fromId: fromAddress.id,
        to: { connect: toAddress.map((a) => ({ id: a!.id })) },
        cc: { connect: ccAddress.map((a) => ({ id: a!.id })) },
        bcc: { connect: bccAddress.map((a) => ({ id: a!.id })) },
        replyTo: { connect: replyToAddress.map((a) => ({ id: a!.id })) },
        hasAttachments: email.hasAttachments,
        body: email.body,
        bodySnippet: email.bodySnippet,
        inReplyTo: email.inReplyTo,
        references: email.references,
        threadIndex: email.threadIndex,
        nativeProperties: email.nativeProperties as any,
        folderId: email.folderId,
        omitted: email.omitted,
      },
    });

    const threadEmails = await prisma.email.findMany({
      where: { threadId: thread.id },
      orderBy: { receivedAt: "asc" },
    });

    let threadFolderType = "sent";
    for (const threadEmail of threadEmails) {
      if (threadEmail.emailLabel === "inbox") {
        threadFolderType = "inbox";
        break; // If any email is in inbox, the whole thread is in inbox
      } else if (threadEmail.emailLabel === "draft") {
        threadFolderType = "draft"; // Set to draft, but continue checking for inbox
      }
    }
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        draftStatus: threadFolderType === "draft",
        inboxStatus: threadFolderType === "inbox",
        sentStatus: threadFolderType === "sent",
      },
    });

    // 4. Upsert Attachments and upload to our image
    for (const attachment of email.attachments) {
      await upsertAttachment(email.id, attachment, accountId).catch(log.error);
    }
  } catch (e) {
    throw e;
  }
}

async function upsertEmailAddress(address: EmailAddress, accountId: string) {
  try {
    const emailAddress = await prisma.emailAddress.findUnique({
      where: {
        accountId_address: {
          accountId: accountId,
          address: address.address,
        },
      },
    });
    if (emailAddress) {
      return await prisma.emailAddress.update({
        where: { id: emailAddress.id },
        data: {
          raw: address.raw,
          name: address.name,
        },
      });
    } else {
      return await prisma.emailAddress.create({
        data: {
          address: address.address,
          name: address.name,
          raw: address.raw,
          accountId,
        },
      });
    }
  } catch (e) {
    throw e;
  }
}

async function upsertAttachment(
  emailId: string,
  attachment: EmailAttachment,
  accountId: string
) {
  try {
    if (!attachment.contentId?.startsWith("uploads/")) {
      const account = await prisma.account.findUnique({
        where: {
          id: accountId,
        },
      });

      const res = await axios.get<{ content: string }>(
        `https://api.aurinko.io/v1/email/messages/${emailId}/attachments/${attachment.id}`,
        {
          headers: {
            Authorization: `Bearer ${account?.accessToken}`,
          },
        }
      );
      const content = res.data.content;
      const fileBuffer = Buffer.from(content, "base64");
      const { fileKey } = await UploadToS3({
        buffer: fileBuffer,
        originalname: attachment.name || "",
      });
      attachment.contentId = fileKey;
    }
    attachment.contentLocation = getS3Url(attachment.contentId);

    await prisma.emailAttachment.upsert({
      where: { id: attachment.id ?? "" },
      update: {
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        inline: attachment.inline,
        contentId: attachment.contentId,
        content: attachment.content,
        contentLocation: attachment.contentLocation,
      },
      create: {
        id: attachment.id,
        emailId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        inline: attachment.inline,
        contentId: attachment.contentId,
        content: attachment.content,
        contentLocation: attachment.contentLocation,
      },
    });
  } catch (error) {
    console.log(`Failed to upsert attachment for email ${emailId}: ${error}`);
  }
}
