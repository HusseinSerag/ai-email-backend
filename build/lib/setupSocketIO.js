"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = __importDefault(require("./logger"));
const socket_1 = require("./socket");
function setupSocketIO(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.ORIGIN,
        },
    });
    io.on("connection", (socket) => {
        const userId = socket.handshake.auth.token;
        socket_1.connectedUsers.addSocketToMap(userId, socket.id);
        logger_1.default.info(`${socket.id} client has connected`);
        socket.on("disconnect", () => {
            socket_1.connectedUsers.removeSocketFromMap(userId, socket.id);
            logger_1.default.info("user disconnected ");
        });
    });
    return io;
}
exports.setupSocketIO = setupSocketIO;
