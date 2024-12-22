import { z } from "zod";
import { emailAddress } from "../type";
import { accountId } from "./account";

export const sendEmailBodySchema = z.object({
  body: z.string(),
  subject: z.string(),
  threadId: z.string().optional(),
  to: z.array(emailAddress),
  from: emailAddress,
  references: z.string().optional(),
  inReplyTo: z.string().optional(),
  cc: z.array(emailAddress).optional(),
  bcc: z.array(emailAddress).optional(),
  replyTo: z.array(emailAddress).optional(),
});
export type SendEmailBody = z.infer<typeof sendEmailBodySchema>;

export const SendEmail = z.object({
  body: sendEmailBodySchema,
  params: accountId,
});
