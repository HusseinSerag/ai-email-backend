import { ConnectionOptions, Queue, QueueEvents } from "bullmq";

export const connection: ConnectionOptions = {
  host: process.env.NODE_ENV === "production" ? "redis" : "localhost",
  port: 6379,
};
export const syncEmailQueue = new Queue("email-sync", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export const eventQueue = new QueueEvents("email-sync", {
  connection,
});
