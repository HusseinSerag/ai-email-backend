"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const customError_1 = require("../lib/customError");
const sendResponse_1 = require("../lib/sendResponse");
const logger_1 = __importDefault(require("../lib/logger"));
function globalErrorHandler(err, req, res, next) {
    logger_1.default.error(err);
    if (err instanceof customError_1.CustomError) {
        (0, sendResponse_1.sendErrorResponse)(res, err.message, err.code);
    }
    else {
        (0, sendResponse_1.sendErrorResponse)(res, "Something went wrong!", customError_1.HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
}
exports.globalErrorHandler = globalErrorHandler;
