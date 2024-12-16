"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const axios_1 = __importStar(require("axios"));
const logger_1 = __importDefault(require("./logger"));
const customError_1 = require("./customError");
const prismaClient_1 = require("./prismaClient");
const syncToDB_1 = require("./syncToDB");
class Account {
    constructor(token) {
        this.token = token;
    }
    async startSync() {
        const res = await axios_1.default.post(`https://api.aurinko.io/v1/email/sync`, {}, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
            params: {
                daysWithin: 2,
                bodyType: "html",
            },
        });
        return res.data;
    }
    async getEmails({ deltaToken, pageToken, }) {
        const params = {};
        if (deltaToken)
            params.deltaToken = deltaToken;
        if (pageToken)
            params.pageToken = pageToken;
        try {
            const res = await axios_1.default.get("https://api.aurinko.io/v1/email/sync/updated", {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
                params,
            });
            return res.data;
        }
        catch (e) {
            throw e;
        }
    }
    async performInitSync() {
        try {
            let syncRes = await this.startSync();
            // syncRes must be ready to start getting delta emails
            logger_1.default.info("starting sync!");
            while (!syncRes.ready) {
                await new Promise((res) => setTimeout(res, 1000));
                syncRes = await this.startSync();
            }
            logger_1.default.info("getting emails");
            let storedDeltaToken = syncRes.syncUpdatedToken;
            let updatedRes = await this.getEmails({
                deltaToken: storedDeltaToken,
            });
            if (updatedRes.nextDeltaToken) {
                storedDeltaToken = updatedRes.nextDeltaToken;
            }
            let emails = updatedRes.records;
            while (updatedRes.nextPageToken) {
                updatedRes = await this.getEmails({
                    pageToken: updatedRes.nextPageToken,
                    deltaToken: storedDeltaToken,
                });
                logger_1.default.info("getting more emails");
                emails = emails.concat(updatedRes.records);
                if (updatedRes.nextDeltaToken) {
                    storedDeltaToken = updatedRes.nextDeltaToken;
                }
            }
            return {
                emails,
                deltaToken: storedDeltaToken,
            };
        }
        catch (e) {
            throw e;
        }
    }
    async sendEmail(body) {
        try {
            console.log(body.attachments);
            const res = await axios_1.default.post("https://api.aurinko.io/v1/email/messages", body, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
                params: {
                    returnIds: true,
                    bodyType: "html",
                },
            });
            logger_1.default.info("Email sent!");
        }
        catch (e) {
            if ((0, axios_1.isAxiosError)(e)) {
                logger_1.default.error(e.cause);
                logger_1.default.error(e.message);
                logger_1.default.error(e.name);
            }
            throw new customError_1.CustomError("Error sending email!", customError_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
        }
    }
    async syncEmails() {
        try {
            const acc = await prismaClient_1.prisma.account.findUnique({
                where: { accessToken: this.token },
            });
            if (!acc)
                throw new customError_1.CustomError("Account not found", customError_1.HttpStatusCode.NOT_FOUND);
            if (!acc.deltaToken)
                throw new customError_1.CustomError("Account not ready for sync", customError_1.HttpStatusCode.BAD_REQUEST);
            let res = await this.getEmails({
                deltaToken: acc.deltaToken,
            });
            let emails = res.records;
            let storedDeltaToken = acc.deltaToken;
            if (res.nextDeltaToken) {
                storedDeltaToken = res.nextDeltaToken;
            }
            while (res.nextPageToken) {
                res = await this.getEmails({ pageToken: res.nextPageToken });
                emails.concat(res.records);
                if (res.nextDeltaToken) {
                    storedDeltaToken = res.nextDeltaToken;
                }
            }
            (0, syncToDB_1.syncEmailsToDB)(emails, acc.id);
            await prismaClient_1.prisma.account.update({
                where: { id: acc.id },
                data: {
                    deltaToken: storedDeltaToken,
                },
            });
        }
        catch (e) {
            throw e;
        }
    }
    async createSubscription() {
        const notificationUrl = `${process.env.SERVER_URL}/api/aurinko/webhook`;
        try {
            const res = await axios_1.default.post("https://api.aurinko.io/v1/subscriptions", {
                resource: "/email/messages",
                notificationUrl,
            }, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
            });
            console.log(res.data);
            return res.data;
        }
        catch (e) {
            console.log("here");
            throw e;
        }
    }
}
exports.Account = Account;
