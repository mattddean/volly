import { z } from "zod";
import { zStr } from "~/lib/forms/zod";

export const generateTeamsSchema = z.object({
	teamSize: z.number().min(1),
	numSchedules: z.number().min(1),
	tournamentId: zStr,
});
export type GenerateTeamsSchema = z.infer<typeof generateTeamsSchema>;
