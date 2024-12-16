import { Router } from "express";
import { getAurinkoUrl, onboardEmail } from "../controllers/email.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/auth/url", requireAuth, getAurinkoUrl);
router.get("/callback", onboardEmail);

export default router;
