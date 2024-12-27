import { CustomError, HttpStatusCode } from "../helpers/customError";

import { prisma } from "../lib/prismaClient";
import { getSubscriptionDetailsService } from "../services/checkout.service";

export async function checkEnoughCredit(userId: string) {
  try {
    const isSubscribed = await getSubscriptionDetailsService(userId);
    if (isSubscribed) return;

    const chatBotInteraction = await prisma.chatbotInteraction.findUnique({
      where: {
        userId,
      },
    });

    if (chatBotInteraction) {
      const firstInteraction = chatBotInteraction.firstInteraction;
      const count = chatBotInteraction.count;
      // check if current time is greater than 24 hours from the first interaction
      if (Date.now() > firstInteraction.getTime() + 24 * 60 * 60 * 1000) {
        await prisma.chatbotInteraction.update({
          where: {
            userId,
          },
          data: {
            count: 0,
            firstInteraction: new Date(),
          },
        });
      } else {
        // check if we have reached the limit of 15 interactions
        if (count >= 15) {
          throw new CustomError(
            "You have reached the limit of 15 interactions, please upgrade your subscription",
            HttpStatusCode.PAYMENT_REQUIRED
          );
        }
      }
    }
  } catch (e) {
    throw e;
  }
}
