import Stripe from "stripe";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { prisma } from "./prismaClient";

export class Payment {
  private api?: Stripe;
  private initialized: boolean = false;
  constructor(private provider: "stripe") {}

  init() {
    if (this.provider === "stripe") {
      this.api = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2024-12-18.acacia",
      });
    }
    this.initialized = true;
  }
  getApi() {
    return this.api;
  }
  async pay(userId: string) {
    if (this.initialized) {
      if (this.provider === "stripe") {
        const checkoutUrl = await this.api?.checkout.sessions.create({
          payment_method_types: ["card"],
          currency: "usd",
          line_items: [
            {
              price: "price_1QZDNyDN4WlO2rbxdAv0tVTT",
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${process.env.CLIENT_URL}/mail`,
          cancel_url: `${process.env.CLIENT_URL}/mail`,
          client_reference_id: userId,
        });
        return checkoutUrl?.url;
      }
    } else {
      throw new CustomError(
        "payment provider not initialized!",
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getSubscriptionDetails(userId: string) {
    if (this.initialized) {
      const subscription = await prisma.subscription.findUnique({
        where: {
          userId,
        },
      });
      if (!subscription) {
        return null;
      }
      return subscription;
    } else {
      throw new CustomError(
        "payment provider not initialized!",
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export const payment = new Payment("stripe");
payment.init();
