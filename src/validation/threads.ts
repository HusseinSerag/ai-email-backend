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
]);
export const DoneSchema = z.union([z.literal("inbox"), z.literal("done")]);
export const getThreadsSchema = z.object({
  params: accountId,
  query: z.object({
    page: z.coerce.number().default(0),
    offset: z.coerce.number().default(10),
    tab: TabSchema.default("inbox"),
    isDone: DoneSchema.default("inbox"),
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
export type Done = z.infer<typeof DoneSchema>;
export type searchThread = z.infer<typeof searchThreadSchema>;
