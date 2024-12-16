import { Router } from "express";
import { generateAIemail } from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.post("/generate", requireAuth, generateAIemail);
export default router;
