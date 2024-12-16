"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_2 = require("@clerk/express");
const routes_1 = require("./routes/routes");
const http_1 = __importDefault(require("http"));
const setupSocketIO_1 = require("./lib/setupSocketIO");
const webhook_1 = require("./routes/webhook");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = (0, setupSocketIO_1.setupSocketIO)(server);
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.post("/api/aurinko/webhook", express_1.default.raw({ type: "*/*" }), webhook_1.validateNotification);
app.use(express_1.default.json());
app.use((0, express_2.clerkMiddleware)());
app.get("/hc", (req, res, next) => {
    res.json({ message: "Hello world!" });
});
const PORT = Number(process.env.PORT) || 3000;
(0, routes_1.routes)(app);
server.listen(PORT, () => {
    console.log(` Server running on Port: ${PORT}`);
});
