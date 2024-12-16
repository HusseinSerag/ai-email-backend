"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const customError_1 = require("../lib/customError");
const express_1 = require("@clerk/express");
async function requireAuth(req, res, next) {
    try {
        const userId = req.auth.userId;
        if (!userId) {
            throw new customError_1.CustomError("Unauthorized", customError_1.HttpStatusCode.UNAUTHORIZED);
        }
        const user = await express_1.clerkClient.users.getUser(userId);
        req.user = user;
        next();
    }
    catch (e) {
        next(e);
    }
}
exports.requireAuth = requireAuth;
