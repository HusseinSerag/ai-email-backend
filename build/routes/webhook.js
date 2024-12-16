"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNotification = void 0;
const express_1 = require("express");
const customError_1 = require("../lib/customError");
const router = (0, express_1.Router)();
router.post("/webhook", validateNotification);
exports.default = router;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../lib/logger"));
const prismaClient_1 = require("../lib/prismaClient");
const account_1 = require("../lib/account");
async function validateNotification(req, res, next) {
    try {
        const validationToken = req.query.validationToken;
        if (validationToken) {
            // **Validation Request**
            console.log("Validation request received:", validationToken);
            res.status(200).send(validationToken);
            return;
        }
        const aurinkoReqTimeStamp = req.headers["x-aurinko-request-timestamp"];
        const signature = req.headers["x-aurinko-signature"];
        if (!aurinkoReqTimeStamp || !signature) {
            throw new customError_1.CustomError("Bad Request", customError_1.HttpStatusCode.BAD_REQUEST);
        }
        const body = JSON.parse(req.body);
        const str = `v0:${aurinkoReqTimeStamp}:${req.body.toString("utf-8")}`;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.AURINKO_SIGNING_SECRET)
            .update(str)
            .digest("hex");
        console.log(`${expectedSignature}\n${signature}`);
        if (expectedSignature !== signature) {
            throw new customError_1.CustomError("Wrong signature!", customError_1.HttpStatusCode.BAD_REQUEST);
        }
        if (req.body) {
            const payload = JSON.parse(req.body);
            logger_1.default.info(`Recieved notification: ${payload.accountId} `);
            const account = await prismaClient_1.prisma.account.findUnique({
                where: {
                    id: payload.accountId.toString(),
                },
            });
            if (!account) {
                return new Response("Account not found", { status: 404 });
            }
            const acc = new account_1.Account(account.accessToken);
            await acc.syncEmails();
        }
        res.status(200).end(req.query.validationToken);
    }
    catch (e) {
        //console.log(e);
        next(e);
    }
}
exports.validateNotification = validateNotification;
