"use server";

import { tournamentsTable } from "~/db/schema";
import { db } from "~/db";
import { withActionResult } from "~/lib/server-actions";
import { newTournamentSchema, type NewTournamentSchema } from "./schemas";
import { redirect } from "next/navigation";
import { format as formatDate } from "date-fns";
import { eq } from "drizzle-orm";

export async function createTournamentAction(data: NewTournamentSchema) {
  const result = await withActionResult(async () => {
    const _validatedData = newTournamentSchema.parse(data);

    const tournamentsOnDay = await db.query.tournamentsTable.findMany({
      where: eq(tournamentsTable.day, formatDate(new Date(), "yyyy-MM-dd")),
    });
    const day = formatDate(new Date(), "yyyy-MM-dd");

    const results = await db
      .insert(tournamentsTable)
      .values({
        name: `${day}/${tournamentsOnDay.length + 1}`,
        day,
      })
      .returning();
    const tournamentId = results[0]?.id;
    if (!tournamentId) {
      throw new Error("DB Error: Did not get inserted tournament id");
    }

    redirect(`/admin/tournaments/${tournamentId}/checkins`);
  }, "Failed to create Tournament");

  return result.response;
}
