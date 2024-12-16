"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const account_controller_1 = require("../controllers/account.controller");
const requireAuth_1 = require("../middleware/requireAuth");
const threads_controller_1 = require("../controllers/threads.controller");
const multer_1 = __importStar(require("multer"));
const router = (0, express_1.Router)();
const storage = (0, multer_1.memoryStorage)();
const upload = (0, multer_1.default)({
    storage,
});
router.get("/user", requireAuth_1.requireAuth, account_controller_1.getAccountsUsers);
router.get("/thread-count/:id", requireAuth_1.requireAuth, account_controller_1.getThreadCountAccounts);
router.get("/threads/:id", requireAuth_1.requireAuth, account_controller_1.getThreadsAccount);
router.get("/suggestions/:id", requireAuth_1.requireAuth, account_controller_1.getSuggestions);
router.get("/thread/:id/:threadId", requireAuth_1.requireAuth, threads_controller_1.getThreadInformation);
router.post("/send/:id", requireAuth_1.requireAuth, upload.array("attachments"), account_controller_1.sendEmailAcc);
exports.default = router;
