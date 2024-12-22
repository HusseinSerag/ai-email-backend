import { Router } from "express";
import { getAccountsUsers } from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/user", requireAuth, getAccountsUsers);

export default router;
