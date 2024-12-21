import { NextFunction, Response } from "express";
import { IRequest } from "../type";
import { askQuestion, generateEmail } from "../services/ai.service";
import { OramaClient } from "../lib/orama";
import { turndown } from "../lib/turndown";
import { summarizeText } from "../lib/analyzeEmail";

export async function generateAIemail(
  req: IRequest<
    {},
    {},
    {
      prompt: string;
      context: string;
    }
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const { context, prompt } = req.body;
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const stream = await generateEmail(context, prompt);
    for await (const part of stream) {
      if (part.choices[0].finish_reason === "stop") {
        res.end();
        return;
      }

      res.write(part.choices[0].delta.content);
    }
  } catch (e) {
    next(e);
  }
}

interface Message {
  content: string;
  id: string;
  role: "user" | "system";
}
export async function generateChat(
  req: IRequest<
    {},
    {},
    {
      accountId: string;
      messages: Message[];
    }
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const { accountId, messages } = req.body;

    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const orama = new OramaClient(accountId);
    await orama.init();

    const content = messages[messages.length - 1].content;
    const searchResults = await orama.vectorSearch({
      term: content,
    });

    const context = await Promise.all(
      searchResults.hits.map(async (result) => {
        const body = turndown.turndown(result.document.body);
        return summarizeText(body);
      })
    );

    const stream = await askQuestion(context.join("\n"), messages);
    for await (const part of stream) {
      if (part.choices[0].finish_reason === "stop") {
        res.end();
        return;
      }

      res.write(part.choices[0].delta.content);
    }
  } catch (e) {
    next(e);
  }
}
