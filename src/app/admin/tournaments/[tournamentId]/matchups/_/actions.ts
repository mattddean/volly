"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, type Transaction } from "~/db";
import {
	checkinsTable,
	matchupsTable,
	teamsTable,
	teamsUsersTable,
	tournamentsTable,
	usersTable,
} from "~/db/schema";
import { ReportableError } from "~/lib/errors/reportable-error";
import { withActionResult } from "~/lib/server-actions";
import { type TeamInfo, VolleyballMatchmaker } from "~/volleyball-matchmaker";
import { type GenerateTeamsSchema, generateTeamsSchema } from "./schemas";

export async function createTeamsAndMatchupsAction(data: GenerateTeamsSchema) {
	const result = await withActionResult(async () => {
		const validatedData = generateTeamsSchema.parse(data);

		await db.transaction(async (tx) => {
			const checkins = await tx.query.checkinsTable.findMany({
				where: and(
					eq(checkinsTable.tournamentId, validatedData.tournamentId),
					isNull(checkinsTable.checkedOutAt),
				),
			});

			const allPlayers = await tx.query.usersTable.findMany();

			const attendingPlayers = await tx.query.usersTable.findMany({
				where: inArray(
					usersTable.id,
					checkins.map((checkin) => checkin.userId),
				),
			});

			const tournament = await tx.query.tournamentsTable.findFirst({
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

			const games = await tx.query.gamesTable.findMany({
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

			// generate 2 schedules for the day; TODO: make this configurable
			const schedules = [];
			for (let i = 0; i < validatedData.numSchedules; i++) {
				schedules.push(
					matchmaker.createOptimalTeamsAndMatchupsIntegrated(
						validatedData.teamSize,
						null,
						3, // 3 games per team
					),
				);
			}

			// delete all existing teams for this tournament
			await db
				.delete(teamsTable)
				.where(eq(teamsTable.tournamentId, validatedData.tournamentId));

			// delete all existing matchups for this tournament
			await db
				.delete(matchupsTable)
				.where(eq(matchupsTable.tournamentId, validatedData.tournamentId));

			// create all schedules in the database
			if (schedules && schedules.length > 0) {
				for (const [scheduleIdx, schedule] of schedules.entries()) {
					// create teams for this schedule
					const dbTeams = [];
					for (const [teamIdx, team] of schedule.teams.entries()) {
						dbTeams.push(
							await createTeam({
								tx,
								team,
								scheduleIdx,
								teamIdx,
								tournamentId: validatedData.tournamentId,
							}),
						);
					}

					// create matchups for this schedule
					for (const [team1Idx, team2Idx] of schedule.schedule) {
						await tx.insert(matchupsTable).values({
							team1Id: dbTeams[team1Idx].id,
							team2Id: dbTeams[team2Idx].id,
							tournamentId: validatedData.tournamentId,
							roundNumber: scheduleIdx + 1,
						});
					}
				}
			}
		});

		revalidatePath(`/admin/tournaments/${validatedData.tournamentId}/matchups`);

		return {
			whatever: "whatever",
		};
	}, "Unable to create teams and matchups");

	return result.response;
}

async function createTeam({
	tx,
	team,
	scheduleIdx,
	teamIdx,
	tournamentId,
}: {
	tx: Transaction;
	team: TeamInfo;
	scheduleIdx: number;
	teamIdx: number;
	tournamentId: string;
}) {
	// create the team with its stats
	const dbResults = await db
		.insert(teamsTable)
		.values({
			name: `Schedule ${scheduleIdx}, Team ${teamIdx + 1}`,
			tournamentId: tournamentId,
			avgZScore: team.avgMMR,
			normalizedAvgZScore: 0, // TODO: remove this
			chemistry: 0, // TODO: remove this
		})
		.returning();
	const dbTeam = dbResults[0];
	if (!dbTeam) {
		throw new Error("DB Error: No team id returned when creating teams");
	}
	// fill the team with its players
	await tx.insert(teamsUsersTable).values(
		team.players.map((player) => ({
			teamId: dbTeam.id,
			userId: player.id,
			tournamentId: tournamentId,
		})),
	);
	return dbTeam;
}
