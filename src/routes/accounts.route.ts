import { Router } from "express";
import {
  getAccountsUsers,
  getSuggestions,
} from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/user", requireAuth, getAccountsUsers);

router.get("/suggestions/:id", requireAuth, getSuggestions);

export default router;
