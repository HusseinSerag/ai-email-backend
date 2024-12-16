"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventQueue = exports.syncEmailQueue = void 0;
const bullmq_1 = require("bullmq");
const account_1 = require("./account");
const prismaClient_1 = require("./prismaClient");
const logger_1 = __importDefault(require("./logger"));
const socket_1 = require("./socket");
const main_1 = require("../main");
exports.syncEmailQueue = new bullmq_1.Queue("email-sync", {
    connection: {
        host: "localhost",
    },
});
exports.eventQueue = new bullmq_1.QueueEvents("email-sync", {
    connection: {
        host: "localhost",
    },
});
exports.eventQueue.on("completed", (job) => {
    const [userId, accountId] = job.returnvalue.split(":");
    // send message that it is completed
    console.log(socket_1.connectedUsers);
    //connectedUsers.removeJobFromMap(job.returnvalue, job.jobId);
    const sockets = socket_1.connectedUsers.getSocketFromMap(userId);
    sockets.forEach((socket) => {
        main_1.io.to(socket).emit("sync-done", {
            status: "completed",
            accountId,
        });
    });
    console.log("After completetion ", socket_1.connectedUsers);
});
exports.eventQueue.on("progress", (job) => {
    const jobId = job.jobId;
    const data = job.data;
    const userId = data.userId;
    const accountId = data.accountId;
    const sockets = socket_1.connectedUsers.getSocketFromMap(userId);
    sockets.forEach((socket) => {
        main_1.io.to(socket).emit("sync-progress", {
            done: data.done,
            total: data.total,
            status: "sync-progress",
            accountId,
        });
    });
    console.log("In progress ", socket_1.connectedUsers);
});
exports.eventQueue.on("failed", (data) => {
    // connectedUsers.removeJobFromMap(data)
    // sendMessage that is error
    console.log(data);
});
const worker = new bullmq_1.Worker("email-sync", async (job) => {
    logger_1.default.info("started job");
    try {
        const accountId = job.data.accountId;
        const userId = job.data.userId;
        const jobId = job.id;
        //perform initial sync
        const accountDB = await prismaClient_1.prisma.account.findUnique({
            where: {
                id: accountId,
            },
        });
        if (!accountDB)
            throw new Error();
        const account = new account_1.Account(accountDB.accessToken);
        const { deltaToken, emails } = await account.performInitSync();
        // write emails to db and the latest delta tokens
        await account.createSubscription();
        await prismaClient_1.prisma.account.update({
            where: {
                id: accountId,
            },
            data: {
                deltaToken,
            },
        });
        // await syncEmailsToDB(emails, accountId, userId, jobId || "");
        await prismaClient_1.prisma.account.update({
            where: {
                id: accountId,
            },
            data: {
                isSyncedInitially: "complete",
            },
        });
        logger_1.default.info("Synced everything up!");
        return `${userId}:${accountId}`;
    }
    catch (e) {
        logger_1.default.error(e);
        throw e;
    }
}, {
    connection: {
        host: "localhost",
    },
});
