import { z } from "zod";
import { zStr } from "~/lib/forms/zod";

export const newUserSchema = z.object({
  name: zStr,
  workbookId: zStr,
});

export type NewUserSchema = z.infer<typeof newUserSchema>;
