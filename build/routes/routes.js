"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const error_controller_1 = require("../controllers/error.controller");
const clerk_1 = __importDefault(require("./clerk"));
const email_1 = __importDefault(require("./email"));
const accounts_1 = __importDefault(require("./accounts"));
const ai_1 = __importDefault(require("./ai"));
function routes(app) {
    app.use("/api/clerk", clerk_1.default);
    app.use("/api/email", email_1.default);
    app.use("/api/accounts", accounts_1.default);
    app.use("/api/ai", ai_1.default);
    //app.use("/api/aurinko", aurinkoRouter);
    app.use(error_controller_1.globalErrorHandler);
}
exports.routes = routes;
