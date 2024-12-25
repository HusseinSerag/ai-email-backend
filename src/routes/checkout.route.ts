import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { createCheckoutSessionController } from "../controllers/checkout.controller";
import { stripeWebhookResponse } from "../controllers/stripeWebhook";

const router = Router();
router.post("/pay", requireAuth, createCheckoutSessionController);

export default router;
