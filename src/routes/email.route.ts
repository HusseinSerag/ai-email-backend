import { Router } from "express";
import {
  getAurinkoUrl,
  onboardEmail,
  sendEmailController,
} from "../controllers/email.controller";
import { requireAuth } from "../middleware/requireAuth";
import multer, { memoryStorage } from "multer";
import { validateEmailSend } from "../middleware/validateSendEmail";

const router = Router();
const storage = memoryStorage();
const upload = multer({
  storage,
});
router.get("/auth/url", requireAuth, getAurinkoUrl);
router.get("/callback", onboardEmail);

router.post(
  "/send/:id",
  requireAuth,
  upload.array("attachments"),
  validateEmailSend,
  sendEmailController
);
export default router;
