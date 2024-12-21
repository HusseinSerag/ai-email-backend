import { Router } from "express";
import { handleUserCreationWebhook } from "../controllers/clerk.controller";

const router = Router();

router.post("/webhook", handleUserCreationWebhook);
export default router;
