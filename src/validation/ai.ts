import * as z from "zod";
import { accountId } from "./account";
export const generateAIEmailSchema = z.object({
  query: z.object({
    prompt: z.string(),
    context: z.string(),
  }),
});

export const MessageSchema = z.object({
  content: z.string(),
  id: z.string(),
  role: z.union([z.literal("user"), z.literal("system")]),
});
export const GenerateChatSchema = z.object({
  params: accountId,
  body: z.object({
    messages: MessageSchema.array(),
  }),
});
export type GenerateChat = z.infer<typeof GenerateChatSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type GenerateAIEmail = z.infer<typeof generateAIEmailSchema>;
