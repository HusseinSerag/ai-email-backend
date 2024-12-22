import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { CustomError } from "../helpers/customError";
import { IRequest } from "../type";
import { SendEmail } from "../validation/email";
import { AccountId } from "./../validation/account";

export function validateEmailSend(
  req: IRequest<any, any, any, any>,
  res: Response,
  next: NextFunction
) {
  try {
    const parsedData = {
      body: req.body.body,
      subject: req.body.subject,
      threadId: req.body.threadId,
      to: JSON.parse(req.body.to),
      from: JSON.parse(req.body.from),
      references: req.body.references,
      inReplyTo: req.body.inReplyTo,
      cc: req.body.cc ? JSON.parse(req.body.cc) : undefined,
      bcc: req.body.bcc ? JSON.parse(req.body.bcc) : undefined,
      replyTo: req.body.replyTo ? JSON.parse(req.body.replyTo) : undefined,
    };
    console.log(parsedData);
    const accountId: AccountId = {
      id: req.params.id,
    };
    const result = SendEmail.safeParse({
      body: parsedData,

      params: accountId,
    });
    req.body = result.data?.body;
    req.params = result.data?.params;
    console.log(result.error);
    if (result.error) {
      const errorMessage = (
        JSON.parse(result.error.message) as [
          {
            message: string;
          },
        ]
      ).map((el) => el.message);

      throw new CustomError(errorMessage.toString(), 400);
    }

    return next();
  } catch (e) {
    return next(e);
  }
}
