import { z } from "zod";
import { zStr } from "~/lib/forms/zod";

export const checkinSchema = z.object({
  userId: zStr,
  workbookId: zStr,
});

export type CheckinSchema = z.infer<typeof checkinSchema>;
