"use server";

import { db } from "~/db";
import { checkinsTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { withActionResult } from "../../../lib/server-actions";

export async function deleteCheckin(checkinId: number) {
  const result = await withActionResult(async () => {
    await db.delete(checkinsTable).where(eq(checkinsTable.id, checkinId));
  }, "Unable to delete checkin");

  return result.response;
}
