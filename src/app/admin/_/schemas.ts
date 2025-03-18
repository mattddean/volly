import { z } from "zod";

export const newTournamentSchema = z.object({});

export type NewTournamentSchema = z.infer<typeof newTournamentSchema>;
