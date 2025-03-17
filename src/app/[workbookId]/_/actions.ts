"use server";

import { db } from "~/db";
import { checkinsTable } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function deleteCheckin(checkinId: number) {
  await db.delete(checkinsTable).where(eq(checkinsTable.id, checkinId));
}
