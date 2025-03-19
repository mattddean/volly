"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "~/db";
import {
  checkinsTable,
  teamsTable,
  teamsUsersTable,
  usersTable,
  matchupsTable,
  tournamentsTable,
} from "~/db/schema";
import { withActionResult } from "~/lib/server-actions";
import { VolleyballMatchmaker } from "~/volleyball-matchmaker";
import { type GenerateTeamsSchema, generateTeamsSchema } from "./schemas";
import { ReportableError } from "~/lib/errors/reportable-error";

export async function createTeamsAndMatchupsAction(data: GenerateTeamsSchema) {
  const result = await withActionResult(async () => {
    const validatedData = generateTeamsSchema.parse(data);

    const checkins = await db.query.checkinsTable.findMany({
      where: and(
        eq(checkinsTable.tournamentId, validatedData.tournamentId),
        isNull(checkinsTable.checkedOutAt),
      ),
    });

    const allPlayers = await db.query.usersTable.findMany();

    const attendingPlayers = await db.query.usersTable.findMany({
      where: inArray(
        usersTable.id,
        checkins.map((checkin) => checkin.userId),
      ),
    });

    const tournament = await db.query.tournamentsTable.findFirst({
      where: eq(tournamentsTable.id, validatedData.tournamentId),
    });

    if (attendingPlayers.length === 0) {
      throw new ReportableError(
        `No players are checked in for Tournament ${tournament?.name}`,
        {
          userMessage: `No players are checked in for Tournament ${tournament?.name}`,
        },
      );
    }

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

    // Generate match schedule for these teams
    const schedule = matchmaker.createMatchSchedule(
      teams.map((tm) => tm.players),
      validatedData.scheduleRounds,
    );

    // delete all existing teams
    await db
      .delete(teamsTable)
      .where(eq(teamsTable.tournamentId, validatedData.tournamentId));

    // delete all existing matchups for this tournament
    await db
      .delete(matchupsTable)
      .where(eq(matchupsTable.tournamentId, validatedData.tournamentId));

    const ts = [];
    for (const [index, tm] of teams.entries()) {
      // create the team with its stats
      const dbResults = await db
        .insert(teamsTable)
        .values({
          name: `Team ${index + 1}`, // Team 1, Team 2, etc.
          tournamentId: validatedData.tournamentId,
          avgZScore: tm.avgZScore,
          normalizedAvgZScore: tm.normalizedAvgZScore,
          chemistry: tm.chemistry,
        })
        .returning();
      const dbTeam = dbResults[0];
      if (!dbTeam) {
        throw new Error("DB Error: No team id returned when creating teams");
      }

      // fill the team with its players
      await db.insert(teamsUsersTable).values(
        tm.players.map((player) => ({
          teamId: dbTeam.id,
          userId: player.id,
          tournamentId: validatedData.tournamentId,
        })),
      );

      ts.push(dbTeam);
    }

    // Create matchups in the database
    if (schedule && schedule.length > 0) {
      for (let roundIdx = 0; roundIdx < schedule.length; roundIdx++) {
        const round = schedule[roundIdx];
        for (const [team1Idx, team2Idx] of round) {
          await db.insert(matchupsTable).values({
            team1Id: ts[team1Idx].id,
            team2Id: ts[team2Idx].id,
            tournamentId: validatedData.tournamentId,
            roundNumber: roundIdx + 1,
          });
        }
      }
    }

    revalidatePath(`/admin/tournaments/${validatedData.tournamentId}/matchups`);

    return {
      numTeams: teams.length,
      hasMatchups: schedule && schedule.length > 0,
    };
  }, "Unable to create teams and matchups");

  return result.response;
}
