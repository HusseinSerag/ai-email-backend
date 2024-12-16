"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncEmailsToDB = void 0;
const logger_1 = __importDefault(require("./logger"));
const p_limit_1 = __importDefault(require("p-limit"));
const prismaClient_1 = require("./prismaClient");
const customError_1 = require("./customError");
const bullMQ_1 = require("./bullMQ");
const axios_1 = __importDefault(require("axios"));
const s3_1 = require("./s3");
async function syncEmailsToDB(emails, accountId, userId, jobId) {
    logger_1.default.info("Attempting sync emails");
    const limit = (0, p_limit_1.default)(5);
    try {
        let index = 0;
        if (userId && jobId) {
            bullMQ_1.eventQueue.emit("progress", {
                data: {
                    done: index,
                    total: emails.length,
                    userId,
                    accountId,
                },
                jobId,
            }, jobId);
        }
        for (const email of emails) {
            await upsertEmail(email, accountId, index++);
            if (jobId && userId) {
                bullMQ_1.eventQueue.emit("progress", {
                    data: {
                        done: index,
                        total: emails.length,
                        userId,
                        accountId,
                    },
                    jobId,
                }, jobId);
            }
        }
    }
    catch (e) {
        logger_1.default.error(e);
        throw e;
    }
}
exports.syncEmailsToDB = syncEmailsToDB;
async function upsertEmail(email, accountId, index) {
    logger_1.default.info(`Upserting email number ${index}`);
    try {
        let emailLabelType = "inbox";
        if (email.sysLabels.includes("important") ||
            email.sysLabels.includes("inbox")) {
            emailLabelType = "inbox";
        }
        else if (email.sysLabels.includes("draft")) {
            emailLabelType = "draft";
        }
        else if (email.sysLabels.includes("sent")) {
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
        let upsertedAddresses = [];
        for (const address of addressesToUpsert.values()) {
            upsertedAddresses.push(await upsertEmailAddress(address, accountId));
        }
        const addressMap = new Map(upsertedAddresses
            .filter(Boolean)
            .map((address) => [address.address, address]));
        const fromAddress = addressMap.get(email.from.address);
        if (!fromAddress) {
            throw new customError_1.CustomError("Address not found!", customError_1.HttpStatusCode.BAD_REQUEST);
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
        const thread = await prismaClient_1.prisma.thread.upsert({
            where: {
                id: email.threadId,
            },
            update: {
                subject: (email === null || email === void 0 ? void 0 : email.subject) || "",
                accountId,
                lastMessageDate: new Date(email.sentAt),
                done: false,
                participantIds: [
                    ...new Set([
                        fromAddress.id,
                        ...toAddress.map((m) => m.id),
                        ...ccAddress.map((m) => m.id),
                        ...bccAddress.map((m) => m.id),
                    ]),
                ],
            },
            create: {
                id: email.threadId,
                accountId,
                subject: (email === null || email === void 0 ? void 0 : email.subject) || "",
                done: false,
                draftStatus: emailLabelType === "draft",
                inboxStatus: emailLabelType === "inbox",
                sentStatus: emailLabelType === "sent",
                lastMessageDate: new Date(email.sentAt),
                participantIds: [
                    ...new Set([
                        fromAddress.id,
                        ...toAddress.map((a) => a.id),
                        ...ccAddress.map((a) => a.id),
                        ...bccAddress.map((a) => a.id),
                    ]),
                ],
            },
        });
        await prismaClient_1.prisma.email.upsert({
            where: { id: email.id },
            update: {
                threadId: thread.id,
                createdTime: new Date(email.createdTime),
                lastModifiedTime: new Date(),
                sentAt: new Date(email.sentAt),
                receivedAt: new Date(email.receivedAt),
                internetMessageId: email.internetMessageId,
                subject: (email === null || email === void 0 ? void 0 : email.subject) || "",
                sysLabels: email.sysLabels,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { set: toAddress.map((a) => ({ id: a.id })) },
                cc: { set: ccAddress.map((a) => ({ id: a.id })) },
                bcc: { set: bccAddress.map((a) => ({ id: a.id })) },
                replyTo: { set: replyToAddress.map((a) => ({ id: a.id })) },
                hasAttachments: email.hasAttachments,
                internetHeaders: email.internetHeaders,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties,
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
                subject: (email === null || email === void 0 ? void 0 : email.subject) || "",
                sysLabels: email.sysLabels,
                internetHeaders: email.internetHeaders,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { connect: toAddress.map((a) => ({ id: a.id })) },
                cc: { connect: ccAddress.map((a) => ({ id: a.id })) },
                bcc: { connect: bccAddress.map((a) => ({ id: a.id })) },
                replyTo: { connect: replyToAddress.map((a) => ({ id: a.id })) },
                hasAttachments: email.hasAttachments,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties,
                folderId: email.folderId,
                omitted: email.omitted,
            },
        });
        const threadEmails = await prismaClient_1.prisma.email.findMany({
            where: { threadId: thread.id },
            orderBy: { receivedAt: "asc" },
        });
        let threadFolderType = "sent";
        for (const threadEmail of threadEmails) {
            if (threadEmail.emailLabel === "inbox") {
                threadFolderType = "inbox";
                break; // If any email is in inbox, the whole thread is in inbox
            }
            else if (threadEmail.emailLabel === "draft") {
                threadFolderType = "draft"; // Set to draft, but continue checking for inbox
            }
        }
        await prismaClient_1.prisma.thread.update({
            where: { id: thread.id },
            data: {
                draftStatus: threadFolderType === "draft",
                inboxStatus: threadFolderType === "inbox",
                sentStatus: threadFolderType === "sent",
            },
        });
        // 4. Upsert Attachments and upload to our image
        for (const attachment of email.attachments) {
            await upsertAttachment(email.id, attachment, accountId).catch(logger_1.default.error);
        }
    }
    catch (e) {
        throw e;
    }
}
async function upsertEmailAddress(address, accountId) {
    try {
        const emailAddress = await prismaClient_1.prisma.emailAddress.findUnique({
            where: {
                accountId_address: {
                    accountId: accountId,
                    address: address.address,
                },
            },
        });
        if (emailAddress) {
            return await prismaClient_1.prisma.emailAddress.update({
                where: { id: emailAddress.id },
                data: {
                    raw: address.raw,
                    name: address.name,
                },
            });
        }
        else {
            return await prismaClient_1.prisma.emailAddress.create({
                data: {
                    address: address.address,
                    name: address.name,
                    raw: address.raw,
                    accountId,
                },
            });
        }
    }
    catch (e) {
        throw e;
    }
}
async function upsertAttachment(emailId, attachment, accountId) {
    var _a, _b;
    try {
        if (!((_a = attachment.contentId) === null || _a === void 0 ? void 0 : _a.startsWith("uploads/"))) {
            const account = await prismaClient_1.prisma.account.findUnique({
                where: {
                    id: accountId,
                },
            });
            console.log(emailId, attachment.id);
            const res = await axios_1.default.get(`https://api.aurinko.io/v1/email/messages/${emailId}/attachments/${attachment.id}`, {
                headers: {
                    Authorization: `Bearer ${account === null || account === void 0 ? void 0 : account.accessToken}`,
                },
            });
            const content = res.data.content;
            const fileBuffer = Buffer.from(content, "base64");
            const { fileKey } = await (0, s3_1.UploadToS3)({
                buffer: fileBuffer,
                originalname: attachment.name || "",
            });
            attachment.contentId = fileKey;
        }
        attachment.contentLocation = (0, s3_1.getS3Url)(attachment.contentId);
        await prismaClient_1.prisma.emailAttachment.upsert({
            where: { id: (_b = attachment.id) !== null && _b !== void 0 ? _b : "" },
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
    }
    catch (error) {
        console.log(`Failed to upsert attachment for email ${emailId}: ${error}`);
    }
}
