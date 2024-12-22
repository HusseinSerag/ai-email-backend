import { z } from "zod";

export const accountId = z.object({
  id: z.string(),
});
export const RequireAccountId = z.object({
  params: accountId,
});
export type AccountId = z.infer<typeof accountId>;
