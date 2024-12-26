import { NextFunction, Request, Response } from "express";
import { payment } from "../lib/payment";
import Stripe from "stripe";
import log from "../helpers/logger";
import { CustomError, HttpStatusCode } from "../helpers/customError";
import { prisma } from "../lib/prismaClient";

export async function stripeWebhookResponse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET as string;

  const sig = req.headers["stripe-signature"]!;

  let event;
  const api = payment.getApi() as Stripe;
  try {
    event = api.webhooks.constructEvent(req.body, sig, endpointSecret);

    log.info(event.type);

    // customerId String
    // subscriptionId String
    //priceId String
    // Handle the event
    const session = event.data.object as Stripe.Checkout.Session;
    log.info(session.client_reference_id);
    if (event.type === "checkout.session.completed") {
      const userId = session.client_reference_id;
      if (!userId) {
        log.error("No user id found in session");
        throw new CustomError(
          "No user id found in session",
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }
      const subscription = await api.subscriptions.retrieve(
        session.subscription as string,
        {
          expand: ["items.data.price.product"],
        }
      );
      const price = subscription.items.data[0]?.price;
      if (!price) {
        log.error("No price found in subscription");
        throw new CustomError(
          "No price found in subscription",
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }
      const product = price.product as Stripe.Product;
      if (!product.id) {
        log.error("No product id found in subscription");
        throw new CustomError(
          "No product id found in subscription",
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }
      await prisma.subscription.create({
        data: {
          subscriptionId: subscription.id,
          customerId: subscription.customer as string,
          priceId: price.id,
          userId: userId,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
    }
    if (event.type === "invoice.payment_succeeded") {
      const userId = session.client_reference_id;
      if (!userId) {
        log.error("No user id found in session");
        throw new CustomError(
          "No user id found in session",
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }
      const subscription = await api.subscriptions.retrieve(
        session.subscription as string,
        {
          expand: ["items.data.price.product"],
        }
      );
      const price = subscription.items.data[0]?.price;
      if (!price) {
        log.error("No price found in subscription");
        throw new CustomError(
          "No price found in subscription",
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }
      const product = price.product as Stripe.Product;

      await prisma.subscription.update({
        where: {
          subscriptionId: subscription.id,
        },
        data: {
          priceId: price.id,

          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
    }
    if (event.type === "customer.subscription.updated") {
      const subscription = await api.subscriptions.retrieve(
        session.id as string
      );

      await prisma.subscription.update({
        where: {
          subscriptionId: session.id,
        },
        data: {
          updatedAt: new Date(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  } catch (err) {
    log.error(err);
    next(err);
    return;
  }
}
