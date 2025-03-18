"use server";

import { and, eq } from "drizzle-orm";
import { checkinsTable, usersTable } from "~/db/schema";
import { db } from "~/db";
import { withActionResult } from "~/lib/server-actions";
import { type CheckinSchema, checkinSchema } from "./schemas";
import { ReportableError } from "~/lib/errors/reportable-error";

export async function checkInAction(data: CheckinSchema) {
  const result = await withActionResult(async () => {
    const validatedData = checkinSchema.parse(data);

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, validatedData.userId),
    });
    if (!user) {
      throw new Error("User not found");
    }

    const checkin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.tournamentId, validatedData.tournamentId),
        eq(checkinsTable.userId, user.id),
      ),
    });

    // allow re-checkin if the user has checked out
    if (checkin?.checkedOutAt) {
      await db
        .update(checkinsTable)
        .set({ checkedOutAt: null })
        .where(eq(checkinsTable.id, checkin.id));
      return;
    }

    // if the user is already checked in, let them know
    if (checkin) {
      throw new ReportableError("You're already checked in!", {
        userMessage: "You're already checked in!",
      });
    }

    await db.insert(checkinsTable).values({
      userId: user.id,
      tournamentId: validatedData.tournamentId,
    });
  }, "Failed to check in");

  return result.response;
}
