import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import { routes } from "./routes/routes";

import http from "http";
import { setupSocketIO } from "./lib/setupSocketIO";

import { validateNotification } from "./routes/webhook";
const app = express();
const server = http.createServer(app);
export const io = setupSocketIO(server);

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
  validateNotification
);
app.use(express.json());

app.use(clerkMiddleware());

app.get("/hc", (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: "Hello world!" });
});

const PORT: number = Number(process.env.PORT) || 3000;
routes(app);
server.listen(PORT, () => {
  console.log(` Server running on Port: ${PORT}`);
});
