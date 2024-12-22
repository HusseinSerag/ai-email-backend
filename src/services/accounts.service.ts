import { CustomError, HttpStatusCode } from "../helpers/customError";
import { prisma } from "../lib/prismaClient";

export async function getAccountAssociatedWithUserService(userId: string) {
  try {
    const accounts = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        account: {
          select: {
            emailAddress: true,
            id: true,
            name: true,
            isSyncedInitially: true,
          },
        },
      },
    });
    if (!accounts)
      throw new CustomError("User does not exist", HttpStatusCode.NOT_FOUND);
    return accounts.account;
  } catch (e) {
    throw e;
  }
}
