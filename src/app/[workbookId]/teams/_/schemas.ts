import { z } from "zod";

export const generateTeamsSchema = z.object({
  teamSize: z.number().min(1),
  scheduleRounds: z.number().min(1),
});
export type GenerateTeamsSchema = z.infer<typeof generateTeamsSchema>;
