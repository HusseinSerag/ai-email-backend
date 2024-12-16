import { Express } from "express";
import { globalErrorHandler } from "../controllers/error.controller";
import clerkRouter from "./clerk";
import emailRouter from "./email";
import accountRouter from "./accounts";
import aiRouter from "./ai";
import aurinkoRouter from "./webhook";

export function routes(app: Express) {
  app.use("/api/clerk", clerkRouter);
  app.use("/api/email", emailRouter);
  app.use("/api/accounts", accountRouter);
  app.use("/api/ai", aiRouter);
  //app.use("/api/aurinko", aurinkoRouter);
  app.use(globalErrorHandler);
}
