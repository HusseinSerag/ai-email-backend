import { Account } from "../lib/account";
import { EmailAttachment } from "../type";
import { SendEmailBody } from "../validation/email";

type Details = SendEmailBody & {
  filesUploaded: Omit<EmailAttachment, "id" | "size">[];
};
export async function sendEmailService(accessToken: string, details: Details) {
  try {
    const acc = new Account(accessToken);
    await acc.sendEmail(details);
  } catch (e) {
    throw e;
  }
}
