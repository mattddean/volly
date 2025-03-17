"use server";

import { and, eq } from "drizzle-orm";
import { attendeeSetsTable, checkinsTable, usersTable } from "~/db/schema";
import { db } from "~/db";
import { withActionResult } from "~/lib/server-actions";
import { CheckinSchema, checkinSchema } from "./schemas";
import { ReportableError } from "../../../../lib/errors/reportable-error";

export async function checkin(data: CheckinSchema) {
  const result = await withActionResult(async () => {
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

    const checkin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.attendeeSetId, attendeeSet.id),
        eq(checkinsTable.userId, user.id)
      ),
    });

    if (checkin) {
      throw new ReportableError("You're already checked in!", {
        userMessage: "You're already checked in!",
      });
    }

    await db.insert(checkinsTable).values({
      attendeeSetId: attendeeSet.id,
      userId: user.id,
    });
  }, "Failed to check in");
  return result.response;
}
