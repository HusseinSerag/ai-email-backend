import { NextFunction, Request, Response } from "express";
import { payment } from "../lib/payment";
import Stripe from "stripe";
import log from "../helpers/logger";

export async function stripeWebhookResponse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET as string;

  const sig = req.headers["stripe-signature"]!;

  let event;

  try {
    event = (payment.getApi() as Stripe).webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );

    console.log(req.body);
  } catch (err) {
    log.error(err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
}
