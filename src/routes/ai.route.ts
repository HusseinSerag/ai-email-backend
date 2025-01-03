import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  generateAIemail,
  generateChat,
  getChatbotInteractionsController,
} from "../controllers/ai.controller";
import validate from "../middleware/validate";
import { GenerateChatSchema, generateAIEmailSchema } from "../validation/ai";

const router = Router();
router.post(
  "/generate",
  requireAuth,
  validate(generateAIEmailSchema),
  generateAIemail
);
router.post(
  "/chat/:id",
  requireAuth,
  validate(GenerateChatSchema),
  generateChat
);
router.get("/interactions", requireAuth, getChatbotInteractionsController);
export default router;
