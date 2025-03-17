"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "~/db";
import {
  attendeeSetsTable,
  checkinsTable,
  teamsTable,
  teamsUsersTable,
  usersTable,
} from "~/db/schema";
import { withActionResult } from "~/lib/server-actions";
import { VolleyballMatchmaker } from "~/volleyball-matchmaker";
import { type GenerateTeamsSchema, generateTeamsSchema } from "./schemas";

export async function createTeamsAndMatchupsAction(data: GenerateTeamsSchema) {
  const result = await withActionResult(async () => {
    const validatedData = generateTeamsSchema.parse(data);

    const attendeeSet = await db.query.attendeeSetsTable.findFirst({
      where: eq(attendeeSetsTable.workbookId, Number(validatedData.workbookId)),
    });

    const checkins = await db.query.checkinsTable.findMany({
      where: eq(checkinsTable.attendeeSetId, attendeeSet?.id ?? 0),
    });

    const allPlayers = await db.query.usersTable.findMany();

    const attendingPlayers = await db.query.usersTable.findMany({
      where: inArray(
        usersTable.id,
        checkins.map((checkin) => checkin.userId),
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
      attendingPlayers,
    );

    const teams = matchmaker.createMultipleTeams(
      validatedData.teamSize,
      null,
      200,
      validatedData.scheduleRounds,
    );

    // delete all existing teams
    await db
      .delete(teamsTable)
      .where(eq(teamsTable.workbookId, Number(validatedData.workbookId)));

    // create enough blank teams
    const ts = await db
      .insert(teamsTable)
      .values(
        teams.map((_player, index) => ({
          name: `Team ${index + 1}`,
          workbookId: Number(validatedData.workbookId),
        })),
      )
      .returning();

    // fill each team with players
    for (const [index, players] of teams.entries()) {
      const team = ts[index];
      await db.insert(teamsUsersTable).values(
        players.map((player) => ({
          teamId: team.id,
          userId: player.id,
        })),
      );
    }

    revalidatePath(`${validatedData.workbookId}/teams`);
  }, "Unable to create teams and matchups");

  return result.response;
}
