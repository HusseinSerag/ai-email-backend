import axios from "axios";
import { URLSearchParams } from "url";
import { EmailMessage } from "../type";

export function getAurinkoAuthURL(
  service: "Google" | "Office365",
  state: Object
) {
  const params = new URLSearchParams({
    clientId: process.env.AURINKO_CLIENT_ID as string,
    serviceType: service,
    scopes: "Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All",
    responseType: "code",
    returnUrl: `${process.env.SERVER_URL as string}/api/email/callback`,
    state: JSON.stringify(state),
  });

  return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
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
