import { CustomError, HttpStatusCode } from "../helpers/customError";
import { payment } from "../lib/payment";

export async function createCheckoutSessionService(userId: string) {
  try {
    const [paymentURL, billingURL] = await Promise.all([
      payment.pay(userId),
      payment.billing(userId),
    ]);
    if (!paymentURL) {
      throw new CustomError(
        "Error generating checkout url",
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
    return {
      paymentURL,
      billingURL,
    };
  } catch (e) {
    throw e;
  }
}

export async function getSubscriptionDetailsService(userId: string) {
  try {
    const subscriptionDetails = await payment.getSubscriptionDetails(userId);
    if (
      !subscriptionDetails ||
      subscriptionDetails.currentPeriodEnd < new Date()
    ) {
      return false;
    }
    return true;
  } catch (e) {
    throw e;
  }
}
