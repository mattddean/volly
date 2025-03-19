"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "~/db";
import { checkinsTable, teamsUsersTable } from "~/db/schema";
import { withActionResult } from "~/lib/server-actions";

export async function moveToTeamAction({
  tournamentId,
  userId,
  newTeamId,
}: {
  tournamentId: string;
  userId: string;
  newTeamId: string;
}) {
  const result = await withActionResult(async () => {
    await db
      .update(teamsUsersTable)
      .set({ teamId: newTeamId })
      .where(
        and(
          eq(teamsUsersTable.userId, userId),
          eq(teamsUsersTable.tournamentId, tournamentId),
        ),
      );

    revalidatePath(`/admin/tournaments/${tournamentId}/matchups`);
    revalidatePath(`/admin/tournaments/${tournamentId}/teams`);
  }, "Unable to move player to team");

  return result.response;
}

export async function removeFromTeamAndCheckOutAction({
  tournamentId,
  userId,
}: {
  tournamentId: string;
  userId: string;
}) {
  const result = await withActionResult(async () => {
    await db
      .delete(teamsUsersTable)
      .where(
        and(
          eq(teamsUsersTable.userId, userId),
          eq(teamsUsersTable.tournamentId, tournamentId),
        ),
      );

    await db
      .update(checkinsTable)
      .set({
        checkedOutAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(checkinsTable.userId, userId),
          eq(checkinsTable.tournamentId, tournamentId),
        ),
      );

    revalidatePath(`/admin/tournaments/${tournamentId}/matchups`);
    revalidatePath(`/admin/tournaments/${tournamentId}/teams`);
  }, "Unable to remove from team and check out");

  return result.response;
}
