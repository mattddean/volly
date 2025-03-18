"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "~/db";
import { checkinsTable, tournamentsTable } from "~/db/schema";
import { withActionResult } from "~/lib/server-actions";

export async function checkInAllPlayersAction({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const result = await withActionResult(async () => {
    const tournament = await db.query.tournamentsTable.findFirst({
      where: eq(tournamentsTable.id, tournamentId),
    });
    if (!tournament) throw new Error("Tournament not found");

    const users = await db.query.usersTable.findMany({});

    await db.insert(checkinsTable).values(
      users.map((user) => ({
        userId: user.id,
        tournamentId,
      })),
    );
  }, "Failed to check in all players");

  return result.response;
}

export async function deleteCheckinAction({
  checkinId,
  tournamentId,
}: { checkinId: string; tournamentId: string }) {
  const result = await withActionResult(async () => {
    await db
      .update(checkinsTable)
      .set({ checkedOutAt: new Date().toISOString() })
      .where(eq(checkinsTable.id, checkinId));

    revalidatePath(`/admin/tournaments/${tournamentId}/checkins`);
  }, "Unable to delete checkin");

  return result.response;
}
