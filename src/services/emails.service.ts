import { Account } from "../lib/account";
import { prisma } from "../lib/prismaClient";
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

export async function getEmailsAssociatedWithAccountService(accountId: string) {
  try {
    const suggestions = await prisma.emailAddress.findMany({
      where: {
        accountId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        raw: true,
      },
    });
    return suggestions;
  } catch (e) {
    throw e;
  }
}
