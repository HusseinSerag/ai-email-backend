"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThreadInformation = void 0;
const prismaClient_1 = require("../lib/prismaClient");
const getAccountUser_1 = require("../middleware/getAccountUser");
const sendResponse_1 = require("../lib/sendResponse");
const customError_1 = require("../lib/customError");
async function getThreadInformation(req, res, next) {
    try {
        const { id: accountId, threadId } = req.params;
        const { id: userId } = req.user;
        const account = await (0, getAccountUser_1.getAccountAssociatedWithUser)({
            accountId,
            userId,
        });
        const thread = await prismaClient_1.prisma.thread.findUnique({
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
                    },
                },
            },
        });
        if (!thread)
            throw new customError_1.CustomError("Thread doesn't exist", customError_1.HttpStatusCode.NOT_FOUND);
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
                ...lastExternalEmail.to.filter((to) => to.address !== account.emailAddress),
            ].filter(Boolean),
            cc: [
                ...lastExternalEmail.cc,
                ...lastExternalEmail.cc.filter((cc) => cc.address !== account.emailAddress),
            ],
            from: {
                name: account.name,
                address: account.emailAddress,
            },
            id: lastExternalEmail.internetMessageId,
        };
        (0, sendResponse_1.sendSuccessResponse)(res, valueReturned, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.getThreadInformation = getThreadInformation;
