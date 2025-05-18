import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod"; // we need to add zod as a dependency
import { teamsTable } from "~/db/schema";
import { defineOperation } from "~/lib/echo/server/helpers";

/**
 * add a new team
 */
export const addTeam = defineOperation({
  name: "addTeam",
  // input validation with zod
  input: z.object({
    name: z.string(),
    tournamentId: z.string(),
  }),
  // executes on both client and server
  execute: async (ctx, input) => {
    const newTeam = {
      id: crypto.randomUUID(), // generate a unique id
      name: input.name,
      tournamentId: input.tournamentId,
      createdAt: new Date(),
      version: 1, // initial version
    };

    return ctx.db.insert(teamsTable).values(newTeam);
  },
});

/**
 * update an existing team
 */
export const updateTeam = defineOperation({
  name: "updateTeam",
  // input validation with zod
  input: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
  }),
  // custom conflict strategy
  conflictStrategy: "merge",
  // executes on both client and server
  execute: async (ctx, input) => {
    const result = await ctx.db
      .update(teamsTable)
      .set({
        name: input.name,
        version: input.version + 1,
      })
      .where(
        and(
          eq(teamsTable.id, input.id),
          // for concurrency control. TODO: do we really need this?
          eq(teamsTable.version, input.version),
        ),
      )
      .returning();

    const row = result[0];

    if (!row) {
      throw new Error("Team was modified concurrently");
    }

    return row;
  },
});

/**
 * get all teams for a tournament
 */
export const getTeamsByTournament = defineOperation({
  name: "getTeamsByTournament",
  // input validation with zod
  input: z.object({
    tournamentId: z.string(),
  }),
  // executes on both client and server
  execute: async (ctx, input) => {
    return ctx.db.query.teamsTable.findMany({
      where: eq(teamsTable.tournamentId, input.tournamentId),
      orderBy: asc(teamsTable.id),
    });
  },
});

/**
 * delete a team
 */
export const deleteTeam = defineOperation({
  name: "deleteTeam",
  // input validation with zod
  input: z.object({
    id: z.string(),
    version: z.number(), // current version for concurrency control
  }),
  // executes on both client and server
  execute: async (ctx, input) => {
    const result = await ctx.db
      .update(teamsTable)
      .set({ deletedAt: sql`NOW()`, version: input.version + 1 })
      .where(
        and(eq(teamsTable.id, input.id), eq(teamsTable.version, input.version)),
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Team was modified concurrently");
    }

    return { success: true };
  },
});
