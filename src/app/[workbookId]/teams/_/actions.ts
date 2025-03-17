"use server";

import { eq, inArray } from "drizzle-orm";
import {
  attendeeSetsTable,
  checkinsTable,
  teamsTable,
  teamsUsersTable,
  usersTable,
} from "~/db/schema";
import { db } from "~/db";
import { VolleyballMatchmaker } from "../../../../volleyball-matchmaker";
import { generateTeamsSchema, GenerateTeamsSchema } from "./schemas";
import { revalidatePath } from "next/cache";

export async function createTeamsAndMatchupsAction(data: GenerateTeamsSchema) {
  const validatedData = generateTeamsSchema.parse(data);

  const workbookId = 1; // TODO: real workbook id

  const attendeeSet = await db.query.attendeeSetsTable.findFirst({
    where: eq(attendeeSetsTable.workbookId, Number(workbookId)),
  });

  const checkins = await db.query.checkinsTable.findMany({
    where: eq(checkinsTable.attendeeSetId, attendeeSet?.id ?? 0),
  });

  const allPlayers = await db.query.usersTable.findMany();

  const attendingPlayers = await db.query.usersTable.findMany({
    where: inArray(
      usersTable.id,
      checkins.map((checkin) => checkin.userId)
    ),
  });

  const games = await db.query.gamesTable.findMany({
    with: {
      matchup: {
        with: {
          team1: { with: { users: { with: { user: true } } } },
          team2: { with: { users: { with: { user: true } } } },
        },
      },
    },
  });
  const historicalGames = games.map((game) => ({
    team1:
      game.matchup?.team1?.users
        .map((user) => user.user)
        .filter((user) => !!user) ?? [],
    team2:
      game.matchup?.team2?.users
        .map((user) => user.user)
        .filter((user) => !!user) ?? [],
    ...game,
  }));

  const matchmaker = new VolleyballMatchmaker(
    allPlayers,
    historicalGames,
    attendingPlayers
  );

  const teams = matchmaker.createMultipleTeams(
    validatedData.teamSize,
    null,
    200,
    validatedData.scheduleRounds
  );

  // delete all existing teams
  await db.delete(teamsTable).where(eq(teamsTable.workbookId, workbookId));

  for (const players of teams) {
    const ts = await db
      .insert(teamsTable)
      .values(
        teams.map(() => ({
          name: "", // TODO: real name or get rid of this
          workbookId,
        }))
      )
      .returning();
    const team = ts[0];
    if (!team) throw new Error("DB Issue: team not returned from insert");

    for (const player of players) {
      await db.insert(teamsUsersTable).values({
        teamId: team.id,
        userId: player.id,
      });
    }
  }

  revalidatePath(`${workbookId}/teams`);
}
