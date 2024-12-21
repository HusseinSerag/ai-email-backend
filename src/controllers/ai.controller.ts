import { NextFunction, Response } from "express";
import { IRequest } from "../type";
import { generateEmail } from "../services/ai.service";

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
