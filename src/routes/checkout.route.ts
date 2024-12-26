import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  createCheckoutSessionController,
  getSubscriptionDetailsController,
} from "../controllers/checkout.controller";

const router = Router();
router.post("/pay", requireAuth, createCheckoutSessionController);
router.get("/subscription", requireAuth, getSubscriptionDetailsController);

export default router;
