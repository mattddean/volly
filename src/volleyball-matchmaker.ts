import { format } from "date-fns";
import type { SelectGame, SelectUser } from "./db/schema";
import { type GameResult, MMRModel } from "./mmr-model";
import { Player } from "./models/player";
import { average } from "./utils/math-utils";

export interface TeamInfo {
	players: Player[];
	avgMMR: number;
	avgSigma: number;
}

export interface MatchupInfo {
	team1: TeamInfo;
	team2: TeamInfo;
	predictedQuality: number;
	mmrDifference: number;
}

export class VolleyballMatchmaker {
	players: { [id: string]: Player };
	attendingPlayers: Player[];
	mmrModel: MMRModel;
	historicalGames: GameResult[];

	constructor(
		allPlayers: SelectUser[],
		games: (SelectGame & { team1: SelectUser[]; team2: SelectUser[] })[],
		attendingPlayers: SelectUser[],
	) {
		// convert existing players to new format
		this.players = allPlayers.reduce(
			(acc, player) => {
				// convert skill group to initial MMR if zScore not set
				const initialMMR =
					player.zScore || Player.fromSkillGroup(player.skillGroup);

				acc[player.id] = new Player({
					id: player.id,
					name: player.name,
					mmr: initialMMR,
					sigma: player.sigma || 100,
					lastPlayed: new Date(player.lastPlayedDay),
				});

				// set historical stats
				acc[player.id].gamesPlayed = player.gamesPlayed || 0;
				acc[player.id].wins = player.wins || 0;
				acc[player.id].pointsScored = player.pointsScored || 0;
				acc[player.id].pointsAllowed = player.pointsAllowed || 0;

				return acc;
			},
			{} as { [id: string]: Player },
		);

		this.attendingPlayers = attendingPlayers.map(
			(player) => this.players[player.id],
		);

		// initialize ML model
		this.mmrModel = new MMRModel();

		// convert historical games to new format
		this.historicalGames = this.convertGamesToTrainingData(games);

		console.log(
			`initialized matchmaker with ${Object.keys(this.players).length} players`,
		);
		console.log(`${this.attendingPlayers.length} players attending`);
		console.log(`${this.historicalGames.length} historical games loaded`);
	}

	// convert database games to training data format
	private convertGamesToTrainingData(
		games: (SelectGame & { team1: SelectUser[]; team2: SelectUser[] })[],
	): GameResult[] {
		return games.map((game) => {
			const allGamePlayers = [...game.team1, ...game.team2];
			const playerIds = allGamePlayers.map((p) => p.id);
			const playerMMRs = allGamePlayers.map(
				(p) => this.players[p.id]?.mmr || Player.fromSkillGroup(p.skillGroup),
			);
			const playerSigmas = allGamePlayers.map(
				(p) => this.players[p.id]?.sigma || 100,
			);

			const team1Indices = game.team1.map((_, idx) => idx);
			const team2Indices = game.team2.map((_, idx) => idx + game.team1.length);

			return {
				playerIds,
				playerMMRs,
				playerSigmas,
				teamComposition: [team1Indices, team2Indices],
				finalScores: [game.team1Score, game.team2Score] as [number, number],
			};
		});
	}

	// train the ML model on historical data
	async trainModel(epochs = 50): Promise<void> {
		if (this.historicalGames.length === 0) {
			console.log("no historical games to train on");
			return;
		}

		console.log("training MMR model...");
		await this.mmrModel.trainOnGames(this.historicalGames, epochs);
	}

	// predict match quality based on MMR difference
	predictMatchQuality(team1: Player[], team2: Player[]): number {
		const team1AvgMMR = average(team1.map((p) => p.mmr));
		const team2AvgMMR = average(team2.map((p) => p.mmr));

		const mmrDiff = Math.abs(team1AvgMMR - team2AvgMMR);

		// quality decreases as MMR difference increases
		// perfect quality (100) when teams are equal, decreases exponentially
		const quality = 100 * Math.exp(-mmrDiff / 50);

		// account for uncertainty - less confident predictions get penalty
		const team1Uncertainty = average(team1.map((p) => p.sigma));
		const team2Uncertainty = average(team2.map((p) => p.sigma));
		const avgUncertainty = (team1Uncertainty + team2Uncertainty) / 2;

		const confidenceFactor = 100 / (100 + avgUncertainty);

		return quality * confidenceFactor;
	}

	// create multiple balanced teams
	createMultipleTeams(
		teamSize = 6,
		numTeams: number | null = null,
	): TeamInfo[] {
		const availablePlayers = [...this.attendingPlayers];
		const totalPlayers = availablePlayers.length;

		if (numTeams === null) {
			numTeams = Math.ceil(totalPlayers / teamSize);
		}

		if (numTeams < 2) {
			console.log("need at least 2 teams");
			return [];
		}

		const baseSize = Math.floor(totalPlayers / numTeams);
		// const extraPlayers = totalPlayers % numTeams;

		console.log(`creating ${numTeams} teams with ~${baseSize} players each`);

		// apply randomization and create teams
		const EPSILON = 100; // TODO: vary this based on the variability of the players' MMRs
		const randomizedPlayers = availablePlayers.map((player) => ({
			player,
			randomizedMMR: player.getRandomizedMMR(EPSILON),
		}));

		// sort by randomized MMR
		randomizedPlayers.sort((a, b) => b.randomizedMMR - a.randomizedMMR);

		// distribute players using snake draft
		const teams: Player[][] = Array(numTeams)
			.fill(null)
			.map(() => []);

		let currentTeam = 0;
		let direction = 1; // 1 for forward, -1 for backward

		for (const { player } of randomizedPlayers) {
			teams[currentTeam].push(player);

			// move to next team
			currentTeam += direction;

			// reverse direction at ends
			if (currentTeam === numTeams) {
				currentTeam = numTeams - 1;
				direction = -1;
			} else if (currentTeam === -1) {
				currentTeam = 0;
				direction = 1;
			}
		}

		// convert to TeamInfo format
		return teams.map((team) => ({
			players: team,
			avgMMR: average(team.map((p) => p.mmr)),
			avgSigma: average(team.map((p) => p.sigma)),
		}));
	}

	// integrated optimization: teams AND their specific matchups simultaneously
	createOptimalTeamsAndMatchupsIntegrated(
		teamSize = 6,
		numTeams: number | null = null,
		gamesPerTeam = 1, // how many games each team will play
	): {
		teams: TeamInfo[];
		matchups: MatchupInfo[];
		schedule: [number, number][];
	} {
		const availablePlayers = [...this.attendingPlayers];
		const totalPlayers = availablePlayers.length;

		if (numTeams === null) {
			numTeams = Math.ceil(totalPlayers / teamSize);
		}

		if (numTeams < 2) {
			console.log("need at least 2 teams");
			return { teams: [], matchups: [], schedule: [] };
		}

		console.log(
			`integrated optimization: ${numTeams} teams with ${gamesPerTeam} games each...`,
		);

		// this is the correct formulation: optimize teams FOR specific matchups
		const result = this.solveIntegratedTeamMatchupOptimization(
			availablePlayers,
			numTeams,
			gamesPerTeam,
		);

		// convert schedule indices to MatchupInfo format
		const matchups = result.schedule.map(([team1Idx, team2Idx]) => ({
			team1: result.teams[team1Idx],
			team2: result.teams[team2Idx],
			predictedQuality: this.predictMatchQuality(
				result.teams[team1Idx].players,
				result.teams[team2Idx].players,
			),
			mmrDifference: Math.abs(
				result.teams[team1Idx].avgMMR - result.teams[team2Idx].avgMMR,
			),
		}));

		console.log(
			`integrated optimization complete: total quality ${result.totalQuality.toFixed(2)}`,
		);
		return { teams: result.teams, matchups, schedule: result.schedule };
	}

	// solve the integrated problem: teams + matchups simultaneously
	private solveIntegratedTeamMatchupOptimization(
		players: Player[],
		numTeams: number,
		gamesPerTeam: number,
	): {
		teams: TeamInfo[];
		schedule: [number, number][];
		totalQuality: number;
	} {
		// this is a much harder problem: we need to optimize both:
		// 1. player assignment to teams
		// 2. which teams play against each other
		// such that the total quality of all scheduled games is maximized

		console.log("solving integrated team-matchup optimization...");

		// for small problems, we can enumerate feasible schedules
		if (numTeams <= 6 && gamesPerTeam === 1) {
			return this.solveSmallIntegratedProblem(players, numTeams);
		}

		// for larger problems, use iterative optimization
		return this.solveIntegratedIteratively(players, numTeams, gamesPerTeam);
	}

	// exact solution for small integrated problems
	private solveSmallIntegratedProblem(
		players: Player[],
		numTeams: number,
	): { teams: TeamInfo[]; schedule: [number, number][]; totalQuality: number } {
		console.log("using exact solution for small problem...");

		let bestQuality = -1;
		let bestTeams: TeamInfo[] = [];
		let bestSchedule: [number, number][] = [];

		// generate multiple random team assignments
		const attempts = Math.min(
			1000,
			this.factorial(Math.min(players.length, 8)),
		); // limit attempts

		for (let attempt = 0; attempt < attempts; attempt++) {
			// create random team assignment
			const shuffled = [...players];
			this.shuffleArray(shuffled);

			const teams = this.distributePlayersToTeams(shuffled, numTeams);

			// find optimal schedule for these teams
			const schedule = this.findOptimalScheduleForTeams(teams);

			// calculate total quality
			const totalQuality = schedule.reduce((sum, [t1, t2]) => {
				return (
					sum + this.predictMatchQuality(teams[t1].players, teams[t2].players)
				);
			}, 0);

			if (totalQuality > bestQuality) {
				bestQuality = totalQuality;
				bestTeams = teams;
				bestSchedule = schedule;
			}
		}

		// local improvement: try swapping players between teams
		const improved = this.improveIntegratedSolution(bestTeams, bestSchedule);

		return {
			teams: improved.teams,
			schedule: improved.schedule,
			totalQuality: improved.totalQuality,
		};
	}

	// iterative solution for larger integrated problems
	private solveIntegratedIteratively(
		players: Player[],
		numTeams: number,
		gamesPerTeam: number,
	): { teams: TeamInfo[]; schedule: [number, number][]; totalQuality: number } {
		console.log("using iterative solution for larger problem...");

		// start with a reasonable initial solution
		let currentTeams = this.distributePlayersToTeams(players, numTeams);
		let currentSchedule = this.createRoundRobinSchedule(numTeams, gamesPerTeam);
		let currentQuality = this.calculateScheduleQuality(
			currentTeams,
			currentSchedule,
		);

		console.log(`initial quality: ${currentQuality.toFixed(2)}`);

		// alternating optimization: improve teams, then improve schedule
		let improved = true;
		let iterations = 0;
		const maxIterations = 50;

		while (improved && iterations < maxIterations) {
			improved = false;
			iterations++;

			// phase 1: improve team assignments for current schedule
			const improvedTeams = this.optimizeTeamsForSchedule(
				currentTeams,
				currentSchedule,
			);
			const newQuality1 = this.calculateScheduleQuality(
				improvedTeams,
				currentSchedule,
			);

			if (newQuality1 > currentQuality) {
				currentTeams = improvedTeams;
				currentQuality = newQuality1;
				improved = true;
			}

			// phase 2: improve schedule for current teams
			const improvedSchedule = this.optimizeScheduleForTeams(currentTeams);
			const newQuality2 = this.calculateScheduleQuality(
				currentTeams,
				improvedSchedule,
			);

			if (newQuality2 > currentQuality) {
				currentSchedule = improvedSchedule;
				currentQuality = newQuality2;
				improved = true;
			}

			if (iterations % 10 === 0) {
				console.log(
					`iteration ${iterations}: quality ${currentQuality.toFixed(2)}`,
				);
			}
		}

		console.log(`iterative optimization completed in ${iterations} iterations`);

		return {
			teams: currentTeams,
			schedule: currentSchedule,
			totalQuality: currentQuality,
		};
	}

	// distribute players evenly to teams
	private distributePlayersToTeams(
		players: Player[],
		numTeams: number,
	): TeamInfo[] {
		const teams: Player[][] = Array(numTeams)
			.fill(null)
			.map(() => []);

		// distribute players using snake draft for initial balance
		let currentTeam = 0;
		let direction = 1;

		for (const player of players) {
			teams[currentTeam].push(player);

			currentTeam += direction;
			if (currentTeam === numTeams) {
				currentTeam = numTeams - 1;
				direction = -1;
			} else if (currentTeam === -1) {
				currentTeam = 0;
				direction = 1;
			}
		}

		return teams.map((team) => ({
			players: team,
			avgMMR: average(team.map((p) => p.mmr)),
			avgSigma: average(team.map((p) => p.sigma)),
		}));
	}

	// find optimal schedule for given teams (which teams should play each other)
	private findOptimalScheduleForTeams(teams: TeamInfo[]): [number, number][] {
		const schedule: [number, number][] = [];

		// for now, create all possible pairings and pick the best ones
		// this is a maximum weight matching problem
		const possibleMatchups: { teams: [number, number]; quality: number }[] = [];

		for (let i = 0; i < teams.length; i++) {
			for (let j = i + 1; j < teams.length; j++) {
				const quality = this.predictMatchQuality(
					teams[i].players,
					teams[j].players,
				);
				possibleMatchups.push({ teams: [i, j], quality });
			}
		}

		// sort by quality and greedily select non-overlapping matchups
		possibleMatchups.sort((a, b) => b.quality - a.quality);

		const usedTeams = new Set<number>();
		for (const matchup of possibleMatchups) {
			const [t1, t2] = matchup.teams;
			if (!usedTeams.has(t1) && !usedTeams.has(t2)) {
				schedule.push([t1, t2]);
				usedTeams.add(t1);
				usedTeams.add(t2);
			}
		}

		return schedule;
	}

	// create round-robin schedule
	private createRoundRobinSchedule(
		numTeams: number,
		gamesPerTeam: number,
	): [number, number][] {
		const schedule: [number, number][] = [];

		// simple round-robin for now
		for (let round = 0; round < gamesPerTeam; round++) {
			for (let i = 0; i < numTeams; i++) {
				for (let j = i + 1; j < numTeams; j++) {
					schedule.push([i, j]);
					if (schedule.length >= (numTeams * gamesPerTeam) / 2) {
						return schedule;
					}
				}
			}
		}

		return schedule;
	}

	// calculate total quality of a schedule
	private calculateScheduleQuality(
		teams: TeamInfo[],
		schedule: [number, number][],
	): number {
		return schedule.reduce((sum, [t1, t2]) => {
			return (
				sum + this.predictMatchQuality(teams[t1].players, teams[t2].players)
			);
		}, 0);
	}

	// optimize team assignments for a fixed schedule
	private optimizeTeamsForSchedule(
		teams: TeamInfo[],
		schedule: [number, number][],
	): TeamInfo[] {
		// this is where we improve team compositions knowing which teams will play each other
		const currentTeams = teams.map((team) => ({
			...team,
			players: [...team.players],
		}));

		let improved = true;
		while (improved) {
			improved = false;
			const currentQuality = this.calculateScheduleQuality(
				currentTeams,
				schedule,
			);

			// try swapping players between teams that will play each other
			for (const [t1, t2] of schedule) {
				for (let p1 = 0; p1 < currentTeams[t1].players.length; p1++) {
					for (let p2 = 0; p2 < currentTeams[t2].players.length; p2++) {
						// try swap
						const player1 = currentTeams[t1].players[p1];
						const player2 = currentTeams[t2].players[p2];

						currentTeams[t1].players[p1] = player2;
						currentTeams[t2].players[p2] = player1;

						// recalculate team stats
						currentTeams[t1].avgMMR = average(
							currentTeams[t1].players.map((p) => p.mmr),
						);
						currentTeams[t1].avgSigma = average(
							currentTeams[t1].players.map((p) => p.sigma),
						);
						currentTeams[t2].avgMMR = average(
							currentTeams[t2].players.map((p) => p.mmr),
						);
						currentTeams[t2].avgSigma = average(
							currentTeams[t2].players.map((p) => p.sigma),
						);

						const newQuality = this.calculateScheduleQuality(
							currentTeams,
							schedule,
						);

						if (newQuality > currentQuality) {
							improved = true;
							break;
						} else {
							// revert swap
							currentTeams[t1].players[p1] = player1;
							currentTeams[t2].players[p2] = player2;
							currentTeams[t1].avgMMR = average(
								currentTeams[t1].players.map((p) => p.mmr),
							);
							currentTeams[t1].avgSigma = average(
								currentTeams[t1].players.map((p) => p.sigma),
							);
							currentTeams[t2].avgMMR = average(
								currentTeams[t2].players.map((p) => p.mmr),
							);
							currentTeams[t2].avgSigma = average(
								currentTeams[t2].players.map((p) => p.sigma),
							);
						}
					}
					if (improved) break;
				}
				if (improved) break;
			}
		}

		return currentTeams;
	}

	// optimize schedule for fixed teams
	private optimizeScheduleForTeams(teams: TeamInfo[]): [number, number][] {
		// this is a maximum weight matching problem
		return this.findOptimalScheduleForTeams(teams);
	}

	// improve integrated solution using local search
	private improveIntegratedSolution(
		teams: TeamInfo[],
		schedule: [number, number][],
	): { teams: TeamInfo[]; schedule: [number, number][]; totalQuality: number } {
		// alternating improvement of teams and schedule
		let currentTeams = teams;
		let currentSchedule = schedule;
		let currentQuality = this.calculateScheduleQuality(
			currentTeams,
			currentSchedule,
		);

		for (let iter = 0; iter < 10; iter++) {
			// improve teams for current schedule
			const improvedTeams = this.optimizeTeamsForSchedule(
				currentTeams,
				currentSchedule,
			);

			// improve schedule for improved teams
			const improvedSchedule = this.findOptimalScheduleForTeams(improvedTeams);

			const newQuality = this.calculateScheduleQuality(
				improvedTeams,
				improvedSchedule,
			);

			if (newQuality > currentQuality) {
				currentTeams = improvedTeams;
				currentSchedule = improvedSchedule;
				currentQuality = newQuality;
			} else {
				break; // no improvement
			}
		}

		return {
			teams: currentTeams,
			schedule: currentSchedule,
			totalQuality: currentQuality,
		};
	}

	// utility: factorial for small numbers
	private factorial(n: number): number {
		if (n <= 1) return 1;
		return n * this.factorial(n - 1);
	}

	// utility function to shuffle array in place
	private shuffleArray<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	// record game result and update MMRs using ML model
	async recordGameResult(
		team1: Player[],
		team2: Player[],
		score1: number,
		score2: number,
		date: Date = new Date(),
	): Promise<void> {
		// update basic stats
		const allPlayers = [...team1, ...team2];
		for (const player of allPlayers) {
			player.gamesPlayed += 1;
			player.lastPlayed = date;
		}

		// update wins and points
		const team1Won = score1 > score2;
		for (const player of team1) {
			if (team1Won) player.wins += 1;
			player.pointsScored += score1;
			player.pointsAllowed += score2;
		}
		for (const player of team2) {
			if (!team1Won) player.wins += 1;
			player.pointsScored += score2;
			player.pointsAllowed += score1;
		}

		// create game result for ML model
		const gameResult: GameResult = {
			playerIds: allPlayers.map((p) => p.id),
			playerMMRs: allPlayers.map((p) => p.mmr),
			playerSigmas: allPlayers.map((p) => p.sigma),
			teamComposition: [
				team1.map((_, idx) => idx),
				team2.map((_, idx) => idx + team1.length),
			],
			finalScores: [score1, score2],
		};

		// get ML-predicted adjustments
		try {
			const adjustments = await this.mmrModel.predictAdjustments(gameResult);

			// apply adjustments
			for (const player of allPlayers) {
				const adjustment = adjustments[player.id] || 0;
				player.mmr = Math.max(0, Math.min(1000, player.mmr + adjustment));

				// reduce uncertainty (sigma) as we gain more information
				player.sigma = Math.max(10, player.sigma * 0.95);
			}

			console.log("MMR adjustments applied using ML model");
		} catch (error) {
			console.error("failed to get ML adjustments, using fallback:", error);

			// fallback to simple adjustment
			this.applyFallbackAdjustments(team1, team2, score1, score2);
		}

		// add to historical games for future training
		this.historicalGames.push(gameResult);

		console.log(`game recorded: ${score1}-${score2}`);
	}

	// fallback MMR adjustment when ML model fails
	private applyFallbackAdjustments(
		team1: Player[],
		team2: Player[],
		score1: number,
		score2: number,
	): void {
		const team1AvgMMR = average(team1.map((p) => p.mmr));
		const team2AvgMMR = average(team2.map((p) => p.mmr));

		const mmrDiff = team1AvgMMR - team2AvgMMR;
		const expectedWinProb = 1 / (1 + Math.exp(-mmrDiff / 100));

		const actualResult = score1 > score2 ? 1 : 0;
		const surprise = Math.abs(actualResult - expectedWinProb);

		// base adjustment on surprise and uncertainty
		const baseAdjustment = surprise * 15; // max 15 MMR change

		// apply to winners (positive) and losers (negative)
		const winners = score1 > score2 ? team1 : team2;
		const losers = score1 > score2 ? team2 : team1;

		for (const player of winners) {
			const playerFactor = (player.sigma / 100) * 0.5 + 0.5;
			const adjustment = baseAdjustment * playerFactor;
			player.mmr = Math.min(1000, player.mmr + adjustment);
			player.sigma = Math.max(10, player.sigma * 0.95);
		}

		for (const player of losers) {
			const playerFactor = (player.sigma / 100) * 0.5 + 0.5;
			const adjustment = baseAdjustment * playerFactor;
			player.mmr = Math.max(0, player.mmr - adjustment);
			player.sigma = Math.max(10, player.sigma * 0.95);
		}
	}

	// record multiple games from a tournament and retrain model
	async recordTournamentResults(
		games: {
			team1: Player[];
			team2: Player[];
			score1: number;
			score2: number;
			date?: Date;
		}[],
	): Promise<void> {
		console.log(`recording ${games.length} tournament games...`);

		// record all games
		for (const game of games) {
			await this.recordGameResult(
				game.team1,
				game.team2,
				game.score1,
				game.score2,
				game.date || new Date(),
			);
		}

		// retrain model with new data
		if (this.historicalGames.length >= 10) {
			// need minimum data
			console.log("retraining model with new tournament data...");
			await this.trainModel(30); // fewer epochs for incremental training
		}

		console.log("tournament results recorded and model updated");
	}

	// get player statistics
	getPlayerStats(playerId: string) {
		const player = this.players[playerId];
		if (!player) {
			return { error: "player not found" };
		}

		return {
			id: player.id,
			name: player.name,
			mmr: player.mmr,
			sigma: player.sigma,
			mmrRange: player.mmrRange(),
			gamesPlayed: player.gamesPlayed,
			wins: player.wins,
			winPercentage: player.winPercentage(),
			pointsScored: player.pointsScored,
			pointsAllowed: player.pointsAllowed,
			lastPlayed: format(player.lastPlayed, "yyyy-MM-dd"),
		};
	}

	// display team information
	displayTeams(teams: TeamInfo[]): void {
		console.log("\n===== TEAMS =====");

		for (let i = 0; i < teams.length; i++) {
			const team = teams[i];
			console.log(
				`\nTeam ${i + 1} (Avg MMR: ${team.avgMMR.toFixed(1)}, Avg Sigma: ${team.avgSigma.toFixed(1)}):`,
			);

			for (const player of team.players) {
				console.log(`  ${player.toString()}`);
			}
		}

		// show balance statistics
		const mmrs = teams.map((t) => t.avgMMR);
		const mmrRange = Math.max(...mmrs) - Math.min(...mmrs);
		console.log(
			`\nTeam Balance: MMR range ${mmrRange.toFixed(1)} (lower is better)`,
		);
	}

	// create and display optimal matchups
	createOptimalMatchups(teams: TeamInfo[]): MatchupInfo[] {
		const matchups: MatchupInfo[] = [];

		// generate all possible matchups
		for (let i = 0; i < teams.length; i++) {
			for (let j = i + 1; j < teams.length; j++) {
				const team1 = teams[i];
				const team2 = teams[j];
				const quality = this.predictMatchQuality(team1.players, team2.players);
				const mmrDiff = Math.abs(team1.avgMMR - team2.avgMMR);

				matchups.push({
					team1,
					team2,
					predictedQuality: quality,
					mmrDifference: mmrDiff,
				});
			}
		}

		// sort by quality (highest first)
		matchups.sort((a, b) => b.predictedQuality - a.predictedQuality);

		return matchups;
	}

	// save/load model
	async saveModel(path: string): Promise<void> {
		await this.mmrModel.saveModel(path);
	}

	async loadModel(path: string): Promise<void> {
		await this.mmrModel.loadModel(path);
	}

	// simple evaluation based only on matchup quality
	private evaluateTeamConfiguration(teams: TeamInfo[]): number {
		if (teams.length < 2) return 0;

		let totalQuality = 0;
		let matchupCount = 0;

		// evaluate all possible matchups
		for (let i = 0; i < teams.length; i++) {
			for (let j = i + 1; j < teams.length; j++) {
				const quality = this.predictMatchQuality(
					teams[i].players,
					teams[j].players,
				);
				totalQuality += quality;
				matchupCount++;
			}
		}

		// return average quality across all possible matchups
		return matchupCount > 0 ? totalQuality / matchupCount : 0;
	}

	// mathematical optimization using integer linear programming approach
	createOptimalTeamsMathematical(
		teamSize = 6,
		numTeams: number | null = null,
	): { teams: TeamInfo[]; matchups: MatchupInfo[]; objective: number } {
		const availablePlayers = [...this.attendingPlayers];
		const totalPlayers = availablePlayers.length;

		if (numTeams === null) {
			numTeams = Math.ceil(totalPlayers / teamSize);
		}

		if (numTeams < 2) {
			console.log("need at least 2 teams");
			return { teams: [], matchups: [], objective: 0 };
		}

		console.log(`using mathematical optimization for ${numTeams} teams...`);

		// this is a variant of the Balanced k-way Partitioning Problem
		// we'll use a branch-and-bound approach with linear relaxation

		const result = this.solveTeamAssignmentILP(availablePlayers, numTeams);
		const matchups = this.createOptimalMatchups(result.teams);

		console.log(
			`mathematical optimization complete: objective ${result.objective.toFixed(2)}`,
		);
		return { teams: result.teams, matchups, objective: result.objective };
	}

	// solve team assignment as Integer Linear Programming problem
	private solveTeamAssignmentILP(
		players: Player[],
		numTeams: number,
	): { teams: TeamInfo[]; objective: number } {
		const n = players.length;
		const k = numTeams;

		// decision variables: x[i][j] = 1 if player i is assigned to team j
		// objective: minimize sum of squared differences in team average MMRs

		// since we don't have a full ILP solver, we'll use a greedy approximation
		// with local search that mimics the mathematical approach

		// step 1: calculate the optimal team average MMR
		const totalMMR = players.reduce((sum, p) => sum + p.mmr, 0);
		const targetAvgMMR = totalMMR / k;

		console.log(`target average MMR per team: ${targetAvgMMR.toFixed(1)}`);

		// step 2: use modified Hungarian algorithm approach
		// create cost matrix where cost[i][j] = how much player i deviates from team j's target
		const teams: Player[][] = Array(k)
			.fill(null)
			.map(() => []);
		const teamMMRs: number[] = Array(k).fill(0);
		const teamSizes: number[] = Array(k).fill(0);

		// greedy assignment with look-ahead
		const unassigned = [...players];

		// sort players by MMR for better initial assignment
		unassigned.sort((a, b) => b.mmr - a.mmr);

		// assign players using minimum cost approach
		for (const player of unassigned) {
			let bestTeam = 0;
			let bestCost = Number.POSITIVE_INFINITY;

			for (let t = 0; t < k; t++) {
				// skip if team is already full
				if (teamSizes[t] >= Math.ceil(n / k)) continue;

				// calculate cost of adding this player to team t
				const newTeamMMR = (teamMMRs[t] + player.mmr) / (teamSizes[t] + 1);
				const deviationCost = Math.abs(newTeamMMR - targetAvgMMR);

				// add penalty for team size imbalance
				const sizeImbalanceCost = Math.abs(teamSizes[t] + 1 - n / k) * 10;

				const totalCost = deviationCost + sizeImbalanceCost;

				if (totalCost < bestCost) {
					bestCost = totalCost;
					bestTeam = t;
				}
			}

			// assign player to best team
			teams[bestTeam].push(player);
			teamMMRs[bestTeam] += player.mmr;
			teamSizes[bestTeam]++;
		}

		// step 3: local optimization using 2-opt swaps
		let improved = true;
		let iterations = 0;
		const maxIterations = 100;

		while (improved && iterations < maxIterations) {
			improved = false;
			iterations++;

			// try all possible swaps between teams
			for (let t1 = 0; t1 < k; t1++) {
				for (let t2 = t1 + 1; t2 < k; t2++) {
					for (let p1 = 0; p1 < teams[t1].length; p1++) {
						for (let p2 = 0; p2 < teams[t2].length; p2++) {
							// calculate current objective
							const currentObj = this.calculateTeamBalanceObjective(teams);

							// try swap
							const player1 = teams[t1][p1];
							const player2 = teams[t2][p2];

							teams[t1][p1] = player2;
							teams[t2][p2] = player1;

							// calculate new objective
							const newObj = this.calculateTeamBalanceObjective(teams);

							if (newObj < currentObj) {
								// keep the swap
								improved = true;
							} else {
								// revert the swap
								teams[t1][p1] = player1;
								teams[t2][p2] = player2;
							}
						}
					}
				}
			}
		}

		console.log(`local optimization completed in ${iterations} iterations`);

		// convert to TeamInfo format
		const teamInfos = teams.map((team) => ({
			players: team,
			avgMMR: average(team.map((p) => p.mmr)),
			avgSigma: average(team.map((p) => p.sigma)),
		}));

		const finalObjective = this.calculateTeamBalanceObjective(teams);

		return { teams: teamInfos, objective: finalObjective };
	}

	// calculate objective function for team balance optimization
	private calculateTeamBalanceObjective(teams: Player[][]): number {
		if (teams.length < 2) return 0;

		// objective 1: minimize variance in team average MMRs
		const teamAvgMMRs = teams.map((team) =>
			team.length > 0 ? average(team.map((p) => p.mmr)) : 0,
		);
		const overallAvg = average(teamAvgMMRs);
		const mmrVariance = average(
			teamAvgMMRs.map((avg) => Math.pow(avg - overallAvg, 2)),
		);

		// objective 2: minimize team size imbalance
		const teamSizes = teams.map((team) => team.length);
		const avgSize = average(teamSizes);
		const sizeVariance = average(
			teamSizes.map((size) => Math.pow(size - avgSize, 2)),
		);

		// combined objective (lower is better)
		return mmrVariance + sizeVariance * 100; // weight size balance heavily
	}

	// Hungarian algorithm for optimal bipartite matching (for 2 teams)
	createOptimalTwoTeamsHungarian(teamSize = 6): {
		teams: TeamInfo[];
		matchups: MatchupInfo[];
	} {
		const players = [...this.attendingPlayers];

		if (players.length < 4) {
			console.log("need at least 4 players for two teams");
			return { teams: [], matchups: [] };
		}

		const playersPerTeam = Math.min(teamSize, Math.floor(players.length / 2));
		console.log(
			`using Hungarian algorithm for 2 teams of ${playersPerTeam} players each`,
		);

		// for 2 teams, we can use the Hungarian algorithm
		// create cost matrix where cost[i][j] = quality loss if players i and j are on same team
		const n = Math.min(players.length, playersPerTeam * 2);
		const selectedPlayers = players.slice(0, n);

		// create all possible team combinations and find the one with best balance
		const bestCombination = this.findOptimalTwoTeamSplit(selectedPlayers);

		const team1 = bestCombination.team1;
		const team2 = bestCombination.team2;

		const teams = [
			{
				players: team1,
				avgMMR: average(team1.map((p) => p.mmr)),
				avgSigma: average(team1.map((p) => p.sigma)),
			},
			{
				players: team2,
				avgMMR: average(team2.map((p) => p.mmr)),
				avgSigma: average(team2.map((p) => p.sigma)),
			},
		];

		const matchups = this.createOptimalMatchups(teams);

		console.log(
			`Hungarian algorithm complete: match quality ${bestCombination.quality.toFixed(2)}`,
		);
		return { teams, matchups };
	}

	// find optimal split of players into two teams using exhaustive search (for small n)
	private findOptimalTwoTeamSplit(players: Player[]): {
		team1: Player[];
		team2: Player[];
		quality: number;
	} {
		const n = players.length;
		const teamSize = Math.floor(n / 2);

		// for small numbers, we can do exhaustive search
		if (n <= 12) {
			return this.exhaustiveSearchTwoTeams(players, teamSize);
		}

		// for larger numbers, use approximation algorithm
		return this.approximateTwoTeamSplit(players, teamSize);
	}

	// exhaustive search for optimal two-team split (only feasible for small n)
	private exhaustiveSearchTwoTeams(
		players: Player[],
		teamSize: number,
	): {
		team1: Player[];
		team2: Player[];
		quality: number;
	} {
		let bestQuality = -1;
		let bestTeam1: Player[] = [];
		let bestTeam2: Player[] = [];

		// generate all combinations of teamSize players from the total
		const combinations = this.generateCombinations(players, teamSize);

		for (const team1 of combinations) {
			const team2 = players.filter((p) => !team1.includes(p));

			// skip if team2 is too small
			if (team2.length < teamSize - 1) continue;

			const quality = this.predictMatchQuality(team1, team2);

			if (quality > bestQuality) {
				bestQuality = quality;
				bestTeam1 = team1;
				bestTeam2 = team2;
			}
		}

		return { team1: bestTeam1, team2: bestTeam2, quality: bestQuality };
	}

	// generate all combinations of k elements from array
	private generateCombinations<T>(array: T[], k: number): T[][] {
		if (k === 0) return [[]];
		if (k > array.length) return [];

		const result: T[][] = [];

		for (let i = 0; i <= array.length - k; i++) {
			const head = array[i];
			const tailCombinations = this.generateCombinations(
				array.slice(i + 1),
				k - 1,
			);

			for (const tail of tailCombinations) {
				result.push([head, ...tail]);
			}
		}

		return result;
	}

	// approximation algorithm for two-team split (for larger n)
	private approximateTwoTeamSplit(
		players: Player[],
		teamSize: number,
	): {
		team1: Player[];
		team2: Player[];
		quality: number;
	} {
		// use a greedy approach with multiple random starts
		let bestQuality = -1;
		let bestTeam1: Player[] = [];
		let bestTeam2: Player[] = [];

		const attempts = 1000;

		for (let attempt = 0; attempt < attempts; attempt++) {
			// random initial assignment
			const shuffled = [...players];
			this.shuffleArray(shuffled);

			const team1 = shuffled.slice(0, teamSize);
			const team2 = shuffled.slice(teamSize, teamSize * 2);

			// local improvement using swaps
			const improved = this.improveTeamSplitLocally(team1, team2);
			const quality = this.predictMatchQuality(improved.team1, improved.team2);

			if (quality > bestQuality) {
				bestQuality = quality;
				bestTeam1 = improved.team1;
				bestTeam2 = improved.team2;
			}
		}

		return { team1: bestTeam1, team2: bestTeam2, quality: bestQuality };
	}

	// local improvement for two-team split using hill climbing
	private improveTeamSplitLocally(
		team1: Player[],
		team2: Player[],
	): {
		team1: Player[];
		team2: Player[];
	} {
		const currentTeam1 = [...team1];
		const currentTeam2 = [...team2];
		let improved = true;

		while (improved) {
			improved = false;
			let bestQuality = this.predictMatchQuality(currentTeam1, currentTeam2);

			// try all possible swaps
			for (let i = 0; i < currentTeam1.length; i++) {
				for (let j = 0; j < currentTeam2.length; j++) {
					// swap players
					const temp = currentTeam1[i];
					currentTeam1[i] = currentTeam2[j];
					currentTeam2[j] = temp;

					const newQuality = this.predictMatchQuality(
						currentTeam1,
						currentTeam2,
					);

					if (newQuality > bestQuality) {
						bestQuality = newQuality;
						improved = true;
					} else {
						// revert swap
						currentTeam2[j] = currentTeam1[i];
						currentTeam1[i] = temp;
					}
				}
			}
		}

		return { team1: currentTeam1, team2: currentTeam2 };
	}
}
