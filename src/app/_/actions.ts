"use server";

import { tournamentsTable } from "~/db/schema";
import { db } from "~/db";
import { withActionResult } from "~/lib/server-actions";
import { newTournamentSchema, type NewTournamentSchema } from "./schemas";
import { redirect } from "next/navigation";

export async function createTournamentAction(data: NewTournamentSchema) {
  const result = await withActionResult(async () => {
    const _validatedData = newTournamentSchema.parse(data);

    const result = await db.insert(tournamentsTable).values({});
    const tournamentId = result.lastInsertRowid;
    if (!tournamentId)
      throw new Error("DB Error: Did not get inserted tournament id");

    redirect(`/${tournamentId}/check-in`);
  }, "Failed to create Tournament");

  return result.response;
}
