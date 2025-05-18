import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "~/db/schema";
import { defineOperation } from "~/lib/echo/server/helpers";

export const addTeam = defineOperation({
  name: "addTeam",
  input: z.object({
    name: z.string(),
    tournamentId: z.string(),
  }),
  execute: async (ctx, input: typeof schema.teamsTable.$inferInsert) => {
    const newTeam = {
      name: input.name,
      tournamentId: input.tournamentId,
      createdAt: new Date(),
    };

    return ctx.db.insert(schema.teamsTable).values(newTeam);
  },
});

export const getTeamsByTournament = defineOperation({
  name: "getTeamsByTournament",
  input: z.object({ tournamentId: z.string() }),
  execute: async (ctx, input) => {
    return ctx.db.query.teamsTable.findMany({
      where: eq(schema.teamsTable.tournamentId, input.tournamentId),
    });
  },
});
