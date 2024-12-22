import { CustomError, HttpStatusCode } from "../helpers/customError";
import { prisma } from "../lib/prismaClient";

export async function getAccountAssociatedWithUser({
  accountId,
  userId,
}: {
  accountId: string;
  userId: string;
}) {
  try {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        AND: {
          users: {
            some: {
              id: userId,
            },
          },
        },
      },
    });
    if (!account)
      throw new CustomError("User does not exist", HttpStatusCode.NOT_FOUND);
    return account;
  } catch (e) {
    throw e;
  }
}
