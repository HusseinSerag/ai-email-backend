import log from "../helpers/logger";
import { connectedUsers } from "../helpers/socket";
import { io } from "../main";
import { eventQueue } from "./queues";

eventQueue.on("completed", (job) => {
  const [userId, accountId] = job.returnvalue.split(":");
  // send message that it is completed

  const sockets = connectedUsers.getSocketFromMap(userId);
  sockets.forEach((socket) => {
    io.to(socket).emit("sync-done", {
      status: "completed",
      accountId,
    });
  });
});
eventQueue.on("progress", (job) => {
  const jobId = job.jobId;
  const data = job.data as {
    done: number;
    total: number;
    userId: string;
    accountId: string;
  };
  const userId = data.userId;
  const accountId = data.accountId;

  const sockets = connectedUsers.getSocketFromMap(userId);
  sockets.forEach((socket) => {
    io.to(socket).emit("sync-progress", {
      done: data.done,
      total: data.total,
      status: "sync-progress",
      accountId,
    });
  });
});

eventQueue.on("failed", (data) => {
  // connectedUsers.removeJobFromMap(data)
  // sendMessage that is error
  log.error("Error syncing mails");
});
