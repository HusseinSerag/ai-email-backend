import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import log from "./logger";
import { connectedUsers } from "./socket";
export function setupSocketIO(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.token as string;
    connectedUsers.addSocketToMap(userId, socket.id);
    log.info(`${socket.id} client has connected`);
    socket.on("disconnect", () => {
      connectedUsers.removeSocketFromMap(userId, socket.id);
      log.info("user disconnected ");
    });
  });

  return io;
}
