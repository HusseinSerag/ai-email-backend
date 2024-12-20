import axios, { isAxiosError } from "axios";
import {
  EmailAddress,
  EmailAttachment,
  EmailMessage,
  SyncResponse,
  SyncUpdatedResponse,
} from "../type";
import log from "./logger";
import { CustomError, HttpStatusCode } from "./customError";
import { prisma } from "./prismaClient";
import { syncEmailsToDB } from "./syncToDB";

export class Account {
  constructor(private token: string) {}
  private async startSync() {
    const res = await axios.post<SyncResponse>(
      `https://api.aurinko.io/v1/email/sync`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },

        params: {
          daysWithin: 0,
          bodyType: "html",
        },
      }
    );
    return res.data;
  }
  private async getEmails({
    deltaToken,
    pageToken,
  }: {
    deltaToken?: string;
    pageToken?: string;
  }) {
    const params: Record<string, string> = {};
    if (deltaToken) params.deltaToken = deltaToken;
    if (pageToken) params.pageToken = pageToken;
    try {
      const res = await axios.get<SyncUpdatedResponse>(
        "https://api.aurinko.io/v1/email/sync/updated",
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          params,
        }
      );
      return res.data;
    } catch (e) {
      throw e;
    }
  }
  async performInitSync() {
    try {
      let syncRes = await this.startSync();
      // syncRes must be ready to start getting delta emails
      log.info("starting sync!");
      while (!syncRes.ready) {
        await new Promise((res) => setTimeout(res, 1000));
        syncRes = await this.startSync();
      }
      log.info("getting emails");
      let storedDeltaToken: string = syncRes.syncUpdatedToken;
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
        });
        log.info("getting more emails");
        emails = emails.concat(updatedRes.records);
        if (updatedRes.nextDeltaToken) {
          storedDeltaToken = updatedRes.nextDeltaToken;
        }
      }

      return {
        emails,
        deltaToken: storedDeltaToken,
      };
    } catch (e) {
      throw e;
    }
  }

  async sendEmail(body: {
    from: EmailAddress;
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress[];
    threadId?: string;
    attachments?: Omit<EmailAttachment, "id" | "size">[];
  }) {
    try {
      const res = await axios.post(
        "https://api.aurinko.io/v1/email/messages",

        body,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          params: {
            returnIds: true,
            bodyType: "html",
          },
        }
      );

      log.info("Email sent!");
    } catch (e) {
      if (isAxiosError(e)) {
        log.error(e.cause);
        log.error(e.message);
        log.error(e.name);
      }
      throw new CustomError(
        "Error sending email!",
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }
  async syncEmails() {
    try {
      const acc = await prisma.account.findUnique({
        where: { accessToken: this.token },
      });
      if (!acc)
        throw new CustomError("Account not found", HttpStatusCode.NOT_FOUND);
      if (!acc.deltaToken)
        throw new CustomError(
          "Account not ready for sync",
          HttpStatusCode.BAD_REQUEST
        );
      let res = await this.getEmails({
        deltaToken: acc.deltaToken,
      });
      let emails: EmailMessage[] = res.records;
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

      syncEmailsToDB(emails, acc.id);
      await prisma.account.update({
        where: { id: acc.id },
        data: {
          deltaToken: storedDeltaToken,
        },
      });
    } catch (e) {
      throw e;
    }
  }

  async createSubscription() {
    const notificationUrl = `${process.env.SERVER_URL}/api/aurinko/webhook`;
    try {
      const res = await axios.post(
        "https://api.aurinko.io/v1/subscriptions",
        {
          resource: "/email/messages",
          notificationUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(res.data);
      return res.data;
    } catch (e) {
      console.log("here");
      throw e;
    }
  }
}
