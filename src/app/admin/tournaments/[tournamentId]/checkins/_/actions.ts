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

    // Get all users
    const users = await db.query.usersTable.findMany({});

    // Get existing check-ins for this tournament
    const existingCheckins = await db.query.checkinsTable.findMany({
      where: eq(checkinsTable.tournamentId, tournamentId),
    });

    // Create a map of user IDs to their check-in records
    const checkinsByUserId = new Map(
      existingCheckins.map((checkin) => [checkin.userId, checkin]),
    );

    // Users who need a new check-in created
    const usersToInsert = users.filter(
      (user) => !checkinsByUserId.has(user.id),
    );

    // Users who need their existing check-in updated (were checked out)
    const checkinsToUpdate = existingCheckins.filter(
      (checkin) => checkin.checkedOutAt !== null,
    );

    // Insert new check-ins
    if (usersToInsert.length > 0) {
      await db.insert(checkinsTable).values(
        usersToInsert.map((user) => ({
          userId: user.id,
          tournamentId,
        })),
      );
    }

    // Update check-ins for users who were checked out
    if (checkinsToUpdate.length > 0) {
      for (const checkin of checkinsToUpdate) {
        await db
          .update(checkinsTable)
          .set({ checkedOutAt: null })
          .where(eq(checkinsTable.id, checkin.id));
      }
    }

    revalidatePath(`/admin/tournaments/${tournamentId}/checkins`);
  }, "Failed to check in all players");

  return result.response;
}

export async function deleteCheckinAction({
  checkinId,
  tournamentId,
}: {
  checkinId: string;
  tournamentId: string;
}) {
  const result = await withActionResult(async () => {
    await db
      .update(checkinsTable)
      .set({ checkedOutAt: new Date() })
      .where(eq(checkinsTable.id, checkinId));

    revalidatePath(`/admin/tournaments/${tournamentId}/checkins`);
  }, "Unable to delete checkin");

  return result.response;
}
