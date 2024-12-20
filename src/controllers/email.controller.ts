import { NextFunction, Response } from "express";
import {
  exchangeCodeForAccessToken,
  getAccountDetail,
  getAurinkoAuthURL,
} from "../lib/aurinko";
import { IRequest } from "../type";
import { sendSuccessResponse } from "../lib/sendResponse";
import { CustomError, HttpStatusCode } from "../lib/customError";
import { prisma } from "../lib/prismaClient";
import log from "../lib/logger";
import { syncEmailQueue } from "../lib/bullMQ";
import crypto from "crypto";
import { connectedUsers } from "../lib/socket";

export function getAurinkoUrl(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  const url = getAurinkoAuthURL("Google", req.user!.id);
  sendSuccessResponse(res, url, HttpStatusCode.OK);
}

export async function onboardEmail(
  req: IRequest<
    {},
    {},
    {},
    {
      code: string;
      requestId: string;
      status: string;
      type: string;
      state: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  const frontend = process.env.CLIENT_URL;
  try {
    if (req.query.status != "success") {
      throw new Error();
    } else {
      const code = req.query.code;
      if (!code) throw new Error();
      const { accessToken, accountId } = await exchangeCodeForAccessToken(code);
      const { email, name } = await getAccountDetail(accessToken);

      let userId = JSON.parse(req.query.state);

      // if webhook fails create a user in our DB
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        // create user and use the id
      }
      // if user already have an account with the same address dont create anything
      const account = await prisma.account.findUnique({
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
      const foundAcc = await prisma.account.findUnique({
        where: {
          emailAddress: email,
        },
      });
      if (foundAcc) {
        await prisma.account.update({
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
      } else {
        // createAccount
        const account = await prisma.account.create({
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
        const customId = crypto.randomUUID().toString();

        syncEmailQueue.add(
          "sync",
          {
            accountId: account.id,
            userId,
          },
          {
            jobId: customId,
          }
        );
      }
    }

    res.redirect(`${frontend}/mail`);
  } catch (e) {
    log.error(e);
    res.redirect(`${frontend}/error?message=${(e as Error).message}`);
  }
}
