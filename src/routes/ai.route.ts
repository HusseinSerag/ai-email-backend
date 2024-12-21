import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { generateAIemail, generateChat } from "../controllers/ai.controller";

const router = Router();
router.post("/generate", requireAuth, generateAIemail);
router.post("/chat", requireAuth, generateChat);
export default router;
