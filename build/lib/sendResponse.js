"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccessResponse = exports.sendErrorResponse = void 0;
function sendErrorResponse(res, message, code) {
    res.status(code).json({
        status: "failure",
        message: message,
    });
}
exports.sendErrorResponse = sendErrorResponse;
function sendSuccessResponse(res, data, code) {
    res.status(code).json({
        status: "success",
        data: data,
    });
}
exports.sendSuccessResponse = sendSuccessResponse;
