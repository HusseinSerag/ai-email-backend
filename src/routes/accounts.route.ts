import { Router } from "express";
import {
  getAccountsUsers,
  getSuggestions,
  sendEmailAcc,
} from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";
import {
  getThreadController,
  getThreadInformation,
  toggleArchiveController,
  toggleStarController,
} from "../controllers/threads.controller";
import multer, { memoryStorage } from "multer";
import { validateEmailSend } from "../middleware/validateSendEmail";

const router = Router();
const storage = memoryStorage();
const upload = multer({
  storage,
});
router.get("/user", requireAuth, getAccountsUsers);

router.get("/suggestions/:id", requireAuth, getSuggestions);

router.post(
  "/send/:id",
  requireAuth,
  upload.array("attachments"),
  validateEmailSend,
  sendEmailAcc
);

export default router;
