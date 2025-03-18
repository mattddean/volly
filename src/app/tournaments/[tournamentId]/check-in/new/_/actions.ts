"use server";

import { checkinsTable, usersTable } from "~/db/schema";
import { type NewUserSchema, newUserSchema } from "./schemas";
import { db } from "~/db";
import { Player } from "~/models/player";
import { format as formatDate } from "date-fns";
import { withActionResult } from "~/lib/server-actions";
import { redirect, RedirectType } from "next/navigation";

export async function createUser(data: NewUserSchema) {
  const result = await withActionResult(async () => {
    const validatedData = newUserSchema.parse(data);

    const player = new Player({
      id: "",
      name: validatedData.name,
    });

    const users = await db
      .insert(usersTable)
      .values({
        name: validatedData.name,
        skillGroup: player.skillGroup,
        zScore: player.zScore,
        sigma: player.sigma,
        lastPlayedDay: formatDate(player.lastPlayed, "yyyy-MM-dd"),
        gamesPlayed: player.gamesPlayed,
        wins: player.wins,
        pointsScored: player.pointsScored,
        pointsAllowed: player.pointsAllowed,
      })
      .returning();
    const user = users[0];
    if (!user) throw new Error("DB error: inserted user not returned");

    await db.insert(checkinsTable).values({
      userId: user.id,
      tournamentId: validatedData.tournamentId,
    });

    redirect(`/${validatedData.tournamentId}/checkin`, RedirectType.replace);
  }, "Unable to check you in. Please ask for help!");

  return result.response;
}
