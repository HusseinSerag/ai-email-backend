import { CustomError, HttpStatusCode } from "../helpers/customError";
import { payment } from "../lib/payment";

export async function createCheckoutSessionService(userId: string) {
  try {
    const checkoutUrl = await payment.pay(userId);
    if (!checkoutUrl) {
      throw new CustomError(
        "Error generating checkout url",
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
    return checkoutUrl;
  } catch (e) {
    throw e;
  }
}

export async function getSubscriptionDetailsService(userId: string) {
  try {
    const subscriptionDetails = await payment.getSubscriptionDetails(userId);
    return subscriptionDetails;
  } catch (e) {
    throw e;
  }
}
