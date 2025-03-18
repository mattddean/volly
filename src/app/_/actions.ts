"use server";

import { workbooksTable } from "~/db/schema";
import { db } from "~/db";
import { withActionResult } from "~/lib/server-actions";
import { newWorkbookSchema, type NewWorkbookSchema } from "./schemas";

export async function createWorkbookAction(data: NewWorkbookSchema) {
  const result = await withActionResult(async () => {
    const _validatedData = newWorkbookSchema.parse(data);

    await db.insert(workbooksTable).values({});
  }, "Failed to check in");

  return result.response;
}
