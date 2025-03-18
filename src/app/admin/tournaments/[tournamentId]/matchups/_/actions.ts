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
      teams,
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

    // create enough blank teams
    const ts = await db
      .insert(teamsTable)
      .values(
        teams.map((_player, index) => ({
          name: `Team ${index + 1}`, // Team 1, Team 2, etc.
          tournamentId: validatedData.tournamentId,
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
          tournamentId: validatedData.tournamentId,
        })),
      );
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

    revalidatePath(`${validatedData.tournamentId}/matchups`);

    return {
      numTeams: teams.length,
      hasMatchups: schedule && schedule.length > 0,
    };
  }, "Unable to create teams and matchups");

  return result.response;
}

export async function moveToTeamAction({
  tournamentId,
  userId,
  newTeamId,
}: {
  tournamentId: string;
  userId: string;
  newTeamId: string;
}) {
  const result = await withActionResult(async () => {
    await db
      .update(teamsUsersTable)
      .set({ teamId: newTeamId })
      .where(
        and(
          eq(teamsUsersTable.userId, userId),
          eq(teamsUsersTable.tournamentId, tournamentId),
        ),
      );

    revalidatePath(`${tournamentId}/matchups`);
  }, "Unable to move player to team");

  return result.response;
}

export async function removeFromTeamAndCheckOutAction({
  tournamentId,
  userId,
}: {
  tournamentId: string;
  userId: string;
}) {
  const result = await withActionResult(async () => {
    await db
      .delete(teamsUsersTable)
      .where(
        and(
          eq(teamsUsersTable.userId, userId),
          eq(teamsUsersTable.tournamentId, tournamentId),
        ),
      );

    await db
      .update(checkinsTable)
      .set({
        checkedOutAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(checkinsTable.userId, userId),
          eq(checkinsTable.tournamentId, tournamentId),
        ),
      );

    revalidatePath(`${tournamentId}/matchups`);
  }, "Unable to remove from team and check out");

  return result.response;
}
