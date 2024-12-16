"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_1 = require("../controllers/email.controller");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.get("/auth/url", requireAuth_1.requireAuth, email_controller_1.getAurinkoUrl);
router.get("/callback", email_controller_1.onboardEmail);
exports.default = router;
