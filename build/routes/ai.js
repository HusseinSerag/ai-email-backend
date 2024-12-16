"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const account_controller_1 = require("../controllers/account.controller");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.post("/generate", requireAuth_1.requireAuth, account_controller_1.generateAIemail);
exports.default = router;
