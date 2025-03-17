"use server";

import { attendeeSetsTable, checkinsTable, usersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { type NewUserSchema, newUserSchema } from "./schemas";
import { db } from "~/db";
import { Player } from "../../../../../models/player";
import { format as formatDate } from "date-fns";

export async function createUser(data: NewUserSchema) {
  const validatedData = newUserSchema.parse(data);

  const attendeeSet = await db.query.attendeeSetsTable.findFirst({
    where: eq(attendeeSetsTable.id, 1), // TODO: real attendee set id
  });
  if (!attendeeSet) {
    throw new Error("Attendee set not found");
  }

  // 0 doesn't matter, db will generate one
  const player = new Player(0, validatedData.name, "E");

  const users = await db
    .insert(usersTable)
    .values({
      name: validatedData.name,
      skillGroup: "E",
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
    attendeeSetId: attendeeSet.id,
    userId: user.id,
  });
}
