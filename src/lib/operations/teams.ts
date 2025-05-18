import { defineOperation } from "~/lib/echo/core";
import * as schema from "~/db/schema";
import { z } from "zod";

export const addTeam = defineOperation({
  name: "addTeam",
  schema: schema.teamsTable,
  input: z.object({
    name: z.string(),
    tournamentId: z.string(),
  }),
  // This function runs on both client (optimistically) and server (actual)
  execute: async (ctx, input: typeof schema.teamsTable.$inferInsert) => {
    const newTeam = {
      name: input.name,
      tournamentId: input.tournamentId,
      createdAt: new Date(),
    };

    return ctx.db.teams.insert(newTeam);
  },
});

export const getTeamsByTournament = defineOperation({
  name: "getTeamsByTournament",
  schema: schema.teamsTable,
  input: z.object({ tournamentId: z.string() }),
  execute: async (ctx, input: typeof schema.teamsTable.$inferInsert) => {
    return ctx.db.teams.where({ tournamentId: input.tournamentId }).toArray();
  },
});
