"use server";

import { attendeeSetsTable, checkinsTable, usersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { CheckinSchema, checkinSchema } from "./schemas";
import { db } from "~/db";

export async function checkin(data: CheckinSchema) {
  const validatedData = checkinSchema.parse(data);

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, Number(validatedData.userId)),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const attendeeSet = await db.query.attendeeSetsTable.findFirst({
    where: eq(attendeeSetsTable.id, 1), // TODO: real attendee set id
  });

  if (!attendeeSet) {
    throw new Error("Attendee set not found");
  }

  await db.insert(checkinsTable).values({
    attendeeSetId: attendeeSet.id,
    userId: user.id,
  });
}
