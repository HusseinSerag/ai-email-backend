import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

import {
  searchThreadsController,
  getThreadsController,
  threadStatsController,
  getThreadInformation,
  getThreadController,
  toggleStarController,
  toggleArchiveController,
} from "../controllers/threads.controller";
import validate from "../middleware/validate";
import { RequireAccountId } from "../validation/account";
import {
  getThreadsSchema,
  requireAccountAndThreadId,
  searchThreadSchema,
} from "../validation/threads";

const router = Router();
router.get(
  "/count/:id",
  requireAuth,
  validate(RequireAccountId),
  threadStatsController
);
router.get(
  "/:id",
  requireAuth,
  validate(getThreadsSchema),
  getThreadsController
);
router.get(
  "/search/:id",
  requireAuth,
  validate(searchThreadSchema),
  searchThreadsController
);
router.get(
  "/info/:id/:threadId",
  requireAuth,
  validate(requireAccountAndThreadId),
  getThreadInformation
);
router.get(
  "/:id/:threadId",
  requireAuth,
  validate(requireAccountAndThreadId),
  getThreadController
);

router.patch(
  "/star/:id/:threadId",
  requireAuth,
  validate(requireAccountAndThreadId),
  toggleStarController
);
router.patch(
  "/archive/:id/:threadId",
  requireAuth,
  validate(requireAccountAndThreadId),
  toggleArchiveController
);

export default router;
