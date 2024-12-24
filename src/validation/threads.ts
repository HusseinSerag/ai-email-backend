import * as z from "zod";
import { accountId } from "./account";

export const searchThreadSchema = z.object({
  params: accountId,
  query: z.object({
    query: z.string(),
  }),
});
export const TabSchema = z.union([
  z.literal("inbox"),
  z.literal("sent"),
  z.literal("draft"),
  z.literal("starred"),
  z.literal("archived"),
  z.literal("social"),
  z.literal("updates"),
  z.literal("personal"),
  z.literal("promotions"),
]);
export const UnreadSchema = z.union([z.literal("all"), z.literal("unread")]);
export const getThreadsSchema = z.object({
  params: accountId,
  query: z.object({
    page: z.coerce.number().default(0),
    offset: z.coerce.number().default(10),
    tab: TabSchema.default("inbox"),
    unread: UnreadSchema.default("all"),
  }),
});

export const requireAccountAndThreadId = z.object({
  params: z.object({
    id: z.string(),
    threadId: z.string(),
  }),
});
export type RequireAccountAndThreadId = z.infer<
  typeof requireAccountAndThreadId
>;
export type GetThreads = z.infer<typeof getThreadsSchema>;
export type Tab = z.infer<typeof TabSchema>;
export type Unread = z.infer<typeof UnreadSchema>;
export type searchThread = z.infer<typeof searchThreadSchema>;
