import { NextFunction, Response } from "express";
import { IRequest } from "../type";
import {
  askQuestion,
  generateContext,
  generateEmail,
  getChatbotInteractionsService,
  performVectorSearch,
  updateInteraction,
} from "../services/ai.service";
import { GenerateAIEmail, GenerateChat } from "../validation/ai";
import { checkEnoughCredit } from "../middleware/checkEnoughCredit";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";

export async function generateAIemail(
  req: IRequest<{}, {}, GenerateAIEmail["query"]>,
  res: Response,
  next: NextFunction
) {
  try {
    const { context, prompt } = req.body;
    // res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");

    const stream = await generateEmail(context, prompt);
    for await (const part of stream) {
      if (part.choices[0].finish_reason === "stop") {
        res.end();
        return;
      }

      res.write(part.choices[0].delta.content);
      res.flush();
    }
  } catch (e) {
    next(e);
  }
}

export async function generateChat(
  req: IRequest<GenerateChat["params"], unknown, GenerateChat["body"]>,
  res: Response,
  next: NextFunction
) {
  try {
    const { messages } = req.body;
    const { id: accountId } = req.params;
    await checkEnoughCredit(req.user!.id);
    //res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");

    const content = messages[messages.length - 1].content;
    const searchResults = await performVectorSearch(content, accountId);
    const context = await generateContext(searchResults);
    const stream = await askQuestion(context.join("\n"), messages);
    await updateInteraction(req.user!.id);
    for await (const part of stream) {
      if (part.choices[0].finish_reason === "stop") {
        res.end();
        return;
      }
      res.write(part.choices[0].delta.content);
      res.flush();
    }
  } catch (e) {
    next(e);
  }
}

export async function getChatbotInteractionsController(
  req: IRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.user!;
    const interaction = await getChatbotInteractionsService(id);
    sendSuccessResponse(res, interaction, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}
