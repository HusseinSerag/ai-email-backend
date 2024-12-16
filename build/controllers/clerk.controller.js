"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserCreationWebhook = void 0;
const customError_1 = require("../lib/customError");
const svix_1 = require("svix");
const sendResponse_1 = require("../lib/sendResponse");
const prismaClient_1 = require("../lib/prismaClient");
const logger_1 = __importDefault(require("../lib/logger"));
async function handleUserCreationWebhook(req, res, next) {
    try {
        const SIGNING_SECRET = process.env.SIGNING_SECRET;
        if (!SIGNING_SECRET) {
            throw new customError_1.CustomError("No signing secret found!", customError_1.HttpStatusCode.OK);
        }
        const wh = new svix_1.Webhook(SIGNING_SECRET);
        const svix_id = req.headers["svix-id"];
        const svix_timestamp = req.headers["svix-timestamp"];
        const svix_signature = req.headers["svix-signature"];
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return new customError_1.CustomError("Missing svix error", customError_1.HttpStatusCode.BAD_REQUEST);
        }
        const data = req.body.data;
        const { first_name, last_name, image_url, email_addresses, id } = data;
        await prismaClient_1.prisma.user.create({
            data: {
                firstName: first_name,
                email: email_addresses[0].email_address,
                lastName: last_name,
                imageUrl: image_url,
                id: id,
            },
        });
        logger_1.default.info("User created!");
        (0, sendResponse_1.sendSuccessResponse)(res, {
            message: "Webhook recieved",
        }, customError_1.HttpStatusCode.OK);
    }
    catch (e) {
        next(e);
    }
}
exports.handleUserCreationWebhook = handleUserCreationWebhook;
