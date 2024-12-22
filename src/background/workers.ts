import { Job, Worker } from "bullmq";

import log from "../helpers/logger";
import { prisma } from "../lib/prismaClient";
import { Account } from "../lib/account";
import { syncEmailsToDB } from "../lib/syncToDB";
import { connection } from "./queues";
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
    connection,
    lockDuration: 60000,
    concurrency: 2,
  }
);
