import { Router } from "express";
import {
  generateAIemail,
  getAccountsUsers,
  getSuggestions,
  getThreadCountAccounts,
  getThreadsAccount,
  searchThreads,
  sendEmailAcc,
} from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";
import { getThreadInformation } from "../controllers/threads.controller";
import multer, { memoryStorage } from "multer";
const router = Router();
const storage = memoryStorage();
const upload = multer({
  storage,
});
router.get("/user", requireAuth, getAccountsUsers);
router.get("/thread-count/:id", requireAuth, getThreadCountAccounts);
router.get("/threads/:id", requireAuth, getThreadsAccount);
router.get("/suggestions/:id", requireAuth, getSuggestions);
router.get("/thread/:id/:threadId", requireAuth, getThreadInformation);
router.get("/search/:id", requireAuth, searchThreads);
router.post(
  "/send/:id",
  requireAuth,
  upload.array("attachments"),
  sendEmailAcc
);

export default router;
