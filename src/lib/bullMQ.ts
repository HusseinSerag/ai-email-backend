import { Job, Queue, Worker, QueueEvents } from "bullmq";

import { Account } from "./account";
import { prisma } from "./prismaClient";
import log from "./logger";
import { syncEmailsToDB } from "./syncToDB";
import { connectedUsers } from "./socket";
import { io } from "../main";

export const syncEmailQueue = new Queue("email-sync", {
  connection: {
    host: "redis",
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export const eventQueue = new QueueEvents("email-sync", {
  connection: {
    host: "redis",
    port: 6379,
  },
});

eventQueue.on("completed", (job) => {
  const [userId, accountId] = job.returnvalue.split(":");
  // send message that it is completed

  //connectedUsers.removeJobFromMap(job.returnvalue, job.jobId);

  const sockets = connectedUsers.getSocketFromMap(userId);
  sockets.forEach((socket) => {
    io.to(socket).emit("sync-done", {
      status: "completed",
      accountId,
    });
  });
  console.log("After completetion ", connectedUsers);
});
eventQueue.on("progress", (job) => {
  const jobId = job.jobId;
  const data = job.data as {
    done: number;
    total: number;
    userId: string;
    accountId: string;
  };
  const userId = data.userId;
  const accountId = data.accountId;

  const sockets = connectedUsers.getSocketFromMap(userId);
  sockets.forEach((socket) => {
    io.to(socket).emit("sync-progress", {
      done: data.done,
      total: data.total,
      status: "sync-progress",
      accountId,
    });
  });
});
eventQueue.on("paused", () => {
  // handle pausing stream
});
eventQueue.on("resumed", () => {
  // handle resume stream
});
eventQueue.on("failed", (data) => {
  // connectedUsers.removeJobFromMap(data)
  // sendMessage that is error
});
export const worker = new Worker(
  "email-sync",
  async (job: Job) => {
    log.info("started job");
    try {
      const accountId = job.data.accountId as string;
      const userId = job.data.userId as string;
      const jobId = job.id;
      //perform initial sync

      const accountDB = await prisma.account.findUnique({
        where: {
          id: accountId,
        },
      });

      if (!accountDB) throw new Error();
      const account = new Account(accountDB.accessToken);
      const { deltaToken, emails } = await account.performInitSync();
      // write emails to db and the latest delta tokens
      await account.createSubscription();
      await prisma.account.update({
        where: {
          id: accountId,
        },
        data: {
          deltaToken,
        },
      });

      await syncEmailsToDB(emails, accountId, userId, jobId || "");
      await prisma.account.update({
        where: {
          id: accountId,
        },
        data: {
          isSyncedInitially: "complete",
        },
      });

      log.info("Synced everything up!");
      return `${userId}:${accountId}`;
    } catch (e) {
      log.error(e);
      throw e;
    }
  },
  {
    connection: {
      host: "redis",
      port: 6379,
    },
    lockDuration: 60000,
    concurrency: 2,
  }
);
