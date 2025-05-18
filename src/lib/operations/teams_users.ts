import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { teamsUsersTable } from "~/db/schema";
import { defineOperation } from "~/lib/echo/core";

const moveToTeamInput = z.object({
  tournamentId: z.string(),
  userId: z.string(),
  newTeamId: z.string(),
});

export const moveToTeam = defineOperation({
  name: "moveToTeam",
  description: "moves a user to a new team for a given tournament",
  input: moveToTeamInput,
  execute: async (ctx, input: z.infer<typeof moveToTeamInput>) => {
    await ctx.db
      .update(teamsUsersTable)
      .set({ teamId: input.newTeamId })
      .where(
        and(
          eq(teamsUsersTable.userId, input.userId),
          eq(teamsUsersTable.tournamentId, input.tournamentId),
        ),
      );

    // todo: how to handle revalidation with echo?
    // for now, we'll keep the existing revalidatePath calls
    // but this might need to be revisited depending on how echo handles cache invalidation.
    revalidatePath(`/admin/tournaments/${input.tournamentId}/matchups`);
    revalidatePath(`/admin/tournaments/${input.tournamentId}/teams`);

    // echo operations usually return the data they acted upon
    // in this case, we don't have a direct return value from the update
    // so we'll return a success message or the input.
    // returning the updated row could also be an option if we fetch it.
    return input;
  },
});
