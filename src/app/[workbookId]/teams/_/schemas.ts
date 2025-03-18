import { z } from "zod";
import { zStr } from "~/lib/forms/zod";

export const generateTeamsSchema = z.object({
  teamSize: z.number().min(1),
  scheduleRounds: z.number().min(1),
  workbookId: zStr,
});
export type GenerateTeamsSchema = z.infer<typeof generateTeamsSchema>;
