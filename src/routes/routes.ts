import { Express } from "express";
import { globalErrorHandler } from "../controllers/error.controller";
import clerkRouter from "./clerk.route";
import emailRouter from "./email.route";
import accountRouter from "./accounts.route";
import aiRouter from "./ai.route";

export function routes(app: Express) {
  app.use("/api/clerk", clerkRouter);
  app.use("/api/email", emailRouter);
  app.use("/api/accounts", accountRouter);
  app.use("/api/ai", aiRouter);

  app.use(globalErrorHandler);
}
