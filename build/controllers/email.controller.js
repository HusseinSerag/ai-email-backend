"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardEmail = exports.getAurinkoUrl = void 0;
const aurinko_1 = require("../lib/aurinko");
const sendResponse_1 = require("../lib/sendResponse");
const customError_1 = require("../lib/customError");
const prismaClient_1 = require("../lib/prismaClient");
const logger_1 = __importDefault(require("../lib/logger"));
const bullMQ_1 = require("../lib/bullMQ");
const crypto_1 = __importDefault(require("crypto"));
function getAurinkoUrl(req, res, next) {
    const url = (0, aurinko_1.getAurinkoAuthURL)("Google", req.user.id);
    (0, sendResponse_1.sendSuccessResponse)(res, url, customError_1.HttpStatusCode.OK);
}
exports.getAurinkoUrl = getAurinkoUrl;
async function onboardEmail(req, res, next) {
    const frontend = process.env.CLIENT_URL;
    try {
        if (req.query.status != "success") {
            throw new Error();
        }
        else {
            const code = req.query.code;
            if (!code)
                throw new Error();
            const { accessToken, accountId } = await (0, aurinko_1.exchangeCodeForAccessToken)(code);
            const { email, name } = await (0, aurinko_1.getAccountDetail)(accessToken);
            let userId = JSON.parse(req.query.state);
            // if webhook fails create a user in our DB
            // const user = prisma.user.findUnique({
            // })
            // if user already have an account with the same address dont create anything
            const account = await prismaClient_1.prisma.account.findUnique({
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
            const foundAcc = await prismaClient_1.prisma.account.findUnique({
                where: {
                    emailAddress: email,
                },
            });
            if (foundAcc) {
                await prismaClient_1.prisma.account.update({
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
            }
            else {
                // createAccount
                const account = await prismaClient_1.prisma.account.create({
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
                const customId = crypto_1.default.randomUUID().toString();
                bullMQ_1.syncEmailQueue.add("sync", {
                    accountId: account.id,
                    userId,
                }, {
                    jobId: customId,
                });
            }
        }
        res.redirect(`${frontend}/mail`);
    }
    catch (e) {
        logger_1.default.error(e);
        res.redirect(`${frontend}/error?message=${e.message}`);
    }
}
exports.onboardEmail = onboardEmail;
