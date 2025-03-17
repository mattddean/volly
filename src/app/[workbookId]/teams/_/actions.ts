"use server";

import { eq, inArray } from "drizzle-orm";
import {
  attendeeSetsTable,
  checkinsTable,
  matchupsTable,
  usersTable,
} from "~/db/schema";
import { db } from "~/db";
import { VolleyballMatchmaker } from "../../../../volleyball-matchmaker";
import { generateTeamsSchema, GenerateTeamsSchema } from "./schemas";

export async function createTeamsAndMatchups(data: GenerateTeamsSchema) {
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

  return teams.map((team) => team.map((player) => player.toObject()));
}
