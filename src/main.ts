import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import { routes } from "./routes/routes";

import http from "http";
import { setupSocketIO } from "./lib/setupSocketIO";

import { syncEmailWebhook } from "./controllers/aurinkoWebhook";
import log from "./helpers/logger";
import { stripeWebhookResponse } from "./controllers/stripeWebhook";
import "./background";
const app = express();
const server = http.createServer(app);
export const io = setupSocketIO(server);

process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);
});

process.on("SIGTERM", () => {
  log.fatal("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    log.error("Closed all remaining connections.");
    process.exit(0);
  });

  setTimeout(() => {
    log.fatal("Forcing shutdown after timeout...");
    process.exit(1);
  }, 10000);
});

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.post(
  "/api/aurinko/webhook",
  express.raw({ type: "*/*" }),
  syncEmailWebhook
);
app.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookResponse
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.get("/hc", (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: "Hello world!" });
});

const PORT: number = Number(process.env.PORT) || 3000;
routes(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(` Server running on Port: ${PORT}`);
});
