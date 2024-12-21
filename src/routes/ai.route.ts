import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { generateAIemail } from "../controllers/ai.controller";

const router = Router();
router.post("/generate", requireAuth, generateAIemail);
export default router;
