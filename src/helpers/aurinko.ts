import axios from "axios";
import { URLSearchParams } from "url";
import { EmailMessage } from "../type";
import { getSubscriptionDetailsService } from "../services/checkout.service";
import { prisma } from "../lib/prismaClient";
import { CustomError, HttpStatusCode } from "./customError";
import log from "./logger";
import { FREE_ACCOUNTS_PER_USER, PRO_ACCOUNTS_PER_USER } from "../lib/globals";

export async function getAurinkoAuthURL(
  service: "Google" | "Office365",
  state: Object,
  userId: string
) {
  try {
    const isSubscribed = await getSubscriptionDetailsService(userId);
    const numberOfAccounts = await prisma.account.count({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    });
    if (isSubscribed) {
      if (numberOfAccounts >= PRO_ACCOUNTS_PER_USER) {
        throw new CustomError(
          "You have reached the limit of accounts you can add. Please upgrade your subscription to add more accounts.",
          HttpStatusCode.FORBIDDEN
        );
      }
    } else {
      if (numberOfAccounts >= FREE_ACCOUNTS_PER_USER) {
        throw new CustomError(
          "You have reached the limit of accounts you can add.",
          HttpStatusCode.BAD_REQUEST
        );
      }
    }
    const params = new URLSearchParams({
      clientId: process.env.AURINKO_CLIENT_ID as string,
      serviceType: service,
      scopes: "Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All",
      responseType: "code",
      returnUrl: `${process.env.SERVER_URL as string}/api/email/callback`,
      state: JSON.stringify(state),
    });

    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
  } catch (e) {
    log.info(`error: ${e}`);
    throw e;
  }
}
export async function exchangeCodeForAccessToken(code: string) {
  try {
    const res = await axios.post(
      `https://api.aurinko.io/v1/auth/token/${code}`,
      {},
      {
        auth: {
          username: process.env.AURINKO_CLIENT_ID!,
          password: process.env.AURINKO_CLIENT_SECRET!,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return res.data as {
      accountId: number;
      accessToken: string;
      userId: string;
      userSession: string;
    };
  } catch (e) {
    throw e;
  }
}

export async function getAccountDetail(accessToken: string) {
  try {
    const res = await axios.get("https://api.aurinko.io/v1/account", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data as {
      email: string;
      name: string;
    };
  } catch (e) {
    throw e;
  }
}
