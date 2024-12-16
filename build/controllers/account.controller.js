"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailAcc = exports.generateAIemail = exports.getSuggestions = exports.getThreadsAccount = exports.getThreadCountAccounts = exports.getAccountsUsers = void 0;
const prismaClient_1 = require("../lib/prismaClient");
const sendResponse_1 = require("../lib/sendResponse");
const customError_1 = require("../lib/customError");
const getAccountUser_1 = require("../middleware/getAccountUser");
const openai_1 = __importDefault(require("openai"));
const account_1 = require("../lib/account");
const s3_1 = require("../lib/s3");
async function getAccountsUsers(req, res, next) {
    try {
        const { id } = req.user;
        const accounts = await prismaClient_1.prisma.user.findUnique({
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
            throw new customError_1.CustomError("User does not exist", customError_1.HttpStatusCode.NOT_FOUND);
        (0, sendResponse_1.sendSuccessResponse)(res, accounts.account, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.getAccountsUsers = getAccountsUsers;
async function getThreadCountAccounts(req, res, next) {
    try {
        const { id: accountId } = req.params;
        const { id: userId } = req.user;
        await (0, getAccountUser_1.getAccountAssociatedWithUser)({
            accountId,
            userId,
        });
        const threadCount = await prismaClient_1.prisma.thread.findMany({
            where: {
                accountId,
            },
        });
        const inbox = [];
        const draft = [];
        const sent = [];
        threadCount.forEach((thread) => {
            if (thread.draftStatus) {
                draft.push(thread);
            }
            else if (thread.inboxStatus) {
                inbox.push(thread);
            }
            else if (thread.sentStatus) {
                sent.push(thread);
            }
        });
        (0, sendResponse_1.sendSuccessResponse)(res, {
            draft: draft.length,
            sent: sent.length,
            inbox: inbox.length,
        }, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.getThreadCountAccounts = getThreadCountAccounts;
async function getThreadsAccount(req, res, next) {
    // filter by inbox, draft, sent
    // filter by done
    try {
        const { id: accountId } = req.params;
        const { tab = "inbox", isDone = false } = req.query;
        const { id: userId } = req.user;
        const account = await (0, getAccountUser_1.getAccountAssociatedWithUser)({
            userId,
            accountId,
        });
        //new Account(account.accessToken).syncEmails().catch(log.error);
        let filter = {};
        if (tab === "inbox") {
            filter.inboxStatus = true;
        }
        else if (tab === "draft") {
            filter.draftStatus = true;
        }
        else if (tab === "sent") {
            filter.sentStatus = true;
        }
        filter.done = {
            equals: isDone === "true" ? true : false,
        };
        filter.accountId = account.id;
        const threads = await prismaClient_1.prisma.thread.findMany({
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
        sentThreads.forEach((threads) => threads.emails.forEach((email) => email.attachments.forEach((attachment) => {
            var _a;
            if ((_a = attachment.contentId) === null || _a === void 0 ? void 0 : _a.startsWith("uploads/")) {
                attachment.contentLocation = (0, s3_1.getS3Url)(attachment.contentId);
            }
        })));
        (0, sendResponse_1.sendSuccessResponse)(res, sentThreads, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.getThreadsAccount = getThreadsAccount;
async function getSuggestions(req, res, next) {
    const { id } = req.params;
    try {
        const suggestions = await prismaClient_1.prisma.emailAddress.findMany({
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
        (0, sendResponse_1.sendSuccessResponse)(res, suggestions, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.getSuggestions = getSuggestions;
const openAi = new openai_1.default({
    apiKey: process.env.OPENAI_SECRET,
});
async function generateAIemail(req, res, next) {
    try {
        const { context, prompt } = req.body;
        res.setHeader("Transfer-Encoding", "chunked");
        res.flushHeaders();
        const stream = await openAi.chat.completions.create({
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
       `,
                },
            ],
            stream: true,
        }, {});
        for await (const part of stream) {
            if (part.choices[0].finish_reason === "stop") {
                res.end();
                return;
            }
            res.write(part.choices[0].delta.content);
        }
    }
    catch (e) {
        next(e);
    }
}
exports.generateAIemail = generateAIemail;
async function sendEmailAcc(req, res, next) {
    try {
        const { id: accountId } = req.params;
        const { id: userId } = req.user;
        const { body, subject, bcc, cc, replyTo, threadId, to, from, inReplyTo, references, } = req.body;
        const account = await (0, getAccountUser_1.getAccountAssociatedWithUser)({
            userId,
            accountId,
        });
        const acc = new account_1.Account(account.accessToken);
        const file = req.files;
        let filesUploaded = [];
        if (file && file.length > 0) {
            // upload file to s3
            // get back info
            await Promise.all(file.map(async (file) => {
                const { fileKey } = await (0, s3_1.UploadToS3)(file);
                filesUploaded.push({
                    mimeType: file.mimetype,
                    name: file.originalname,
                    inline: false,
                    contentLocation: (0, s3_1.getS3Url)(fileKey),
                    content: file.buffer.toString("base64"),
                    contentId: fileKey,
                });
            }));
        }
        await acc.sendEmail({
            body,
            subject,
            threadId,
            to: JSON.parse(to),
            from: JSON.parse(from),
            inReplyTo,
            references,
            bcc: bcc && JSON.parse(bcc),
            cc: cc && JSON.parse(cc),
            replyTo: replyTo && JSON.parse(replyTo),
            attachments: filesUploaded,
        });
        (0, sendResponse_1.sendSuccessResponse)(res, {}, customError_1.HttpStatusCode.CREATED);
    }
    catch (e) {
        next(e);
    }
}
exports.sendEmailAcc = sendEmailAcc;
