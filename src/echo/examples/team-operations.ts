import { defineOperation } from "../core";
import { z } from "zod"; // we need to add zod as a dependency

// example schema (in a real app, this would be from your actual schema)
const teamSchema = {
  table: "teams",
  fields: {
    id: "string",
    name: "string",
    tournamentId: "string",
    createdAt: "date",
    version: "number",
  },
};

/**
 * add a new team
 */
export const addTeam = defineOperation({
  name: "addTeam",
  schema: teamSchema,
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

    return ctx.db.teams.insert(newTeam);
  },
});

/**
 * update an existing team
 */
export const updateTeam = defineOperation({
  name: "updateTeam",
  schema: teamSchema,
  // input validation with zod
  input: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(), // current version for concurrency control
  }),
  // custom conflict strategy
  conflictStrategy: "merge",
  // executes on both client and server
  execute: async (ctx, input) => {
    const result = await ctx.db.teams.updateWhere(
      { id: input.id, version: input.version },
      {
        name: input.name,
        version: input.version + 1, // increment version
      },
    );

    if (result.affectedRows === 0) {
      throw new Error("Team was modified concurrently");
    }

    return result.row;
  },
});

/**
 * get all teams for a tournament
 */
export const getTeamsByTournament = defineOperation({
  name: "getTeamsByTournament",
  schema: teamSchema,
  // input validation with zod
  input: z.object({
    tournamentId: z.string(),
  }),
  // executes on both client and server
  execute: async (ctx, input) => {
    return ctx.db.teams.findMany({
      where: { tournamentId: input.tournamentId },
      orderBy: { id: "asc" },
    });
  },
});

/**
 * delete a team
 */
export const deleteTeam = defineOperation({
  name: "deleteTeam",
  schema: teamSchema,
  // input validation with zod
  input: z.object({
    id: z.string(),
    version: z.number(), // current version for concurrency control
  }),
  // executes on both client and server
  execute: async (ctx, input) => {
    const result = await ctx.db.teams.updateWhere(
      { id: input.id, version: input.version },
      { deleted: true, version: input.version + 1 },
    );

    if (result.affectedRows === 0) {
      throw new Error("Team was modified concurrently");
    }

    return { success: true };
  },
});
