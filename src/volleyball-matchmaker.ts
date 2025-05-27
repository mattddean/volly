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
}
