import * as tf from "@tensorflow/tfjs-node";

export interface GameResult {
	playerMMRs: number[];
	playerSigmas: number[];
	teamComposition: number[][]; // [team1PlayerIndices, team2PlayerIndices]
	finalScores: [number, number];
	playerIds: string[];
}

export interface TrainingData {
	games: GameResult[];
}

export class MMRModel {
	private model: tf.LayersModel | null = null;
	private isTraining = false;

	constructor() {
		// initialize TensorFlow.js backend
		this.initializeModel();
	}

	private initializeModel(): void {
		// create a simple feedforward neural network
		// input: player features (MMR, sigma, team composition, game outcome)
		// output: MMR adjustment for each player

		const model = tf.sequential({
			layers: [
				// input layer: [playerMMR, playerSigma, teamAvgMMR, opponentAvgMMR, scoreDiff, won]
				tf.layers.dense({
					inputShape: [6],
					units: 32,
					activation: "relu",
					name: "hidden1",
				}),
				tf.layers.dense({
					units: 16,
					activation: "relu",
					name: "hidden2",
				}),
				tf.layers.dense({
					units: 8,
					activation: "relu",
					name: "hidden3",
				}),
				// output: single MMR adjustment value
				tf.layers.dense({
					units: 1,
					activation: "linear", // can be positive or negative
					name: "output",
				}),
			],
		});

		// compile with optimizer focused on minimizing prediction error
		model.compile({
			optimizer: tf.train.adam(0.001),
			loss: "meanSquaredError",
			metrics: ["mae"],
		});

		this.model = model;
	}

	// prepare training data from game results
	private prepareTrainingData(games: GameResult[]): {
		inputs: tf.Tensor;
		outputs: tf.Tensor;
	} {
		const inputs: number[][] = [];
		const outputs: number[] = [];

		for (const game of games) {
			const [score1, score2] = game.finalScores;
			const scoreDiff = Math.abs(score1 - score2);

			// calculate team averages
			const team1Indices = game.teamComposition[0];
			const team2Indices = game.teamComposition[1];

			const team1AvgMMR =
				team1Indices.reduce((sum, idx) => sum + game.playerMMRs[idx], 0) /
				team1Indices.length;
			const team2AvgMMR =
				team2Indices.reduce((sum, idx) => sum + game.playerMMRs[idx], 0) /
				team2Indices.length;

			// create training examples for each player
			for (let i = 0; i < game.playerIds.length; i++) {
				const playerMMR = game.playerMMRs[i];
				const playerSigma = game.playerSigmas[i];

				// determine which team the player was on
				const onTeam1 = team1Indices.includes(i);
				const teamAvgMMR = onTeam1 ? team1AvgMMR : team2AvgMMR;
				const opponentAvgMMR = onTeam1 ? team2AvgMMR : team1AvgMMR;
				const won = onTeam1
					? score1 > score2
						? 1
						: 0
					: score2 > score1
						? 1
						: 0;

				// input features: [playerMMR, playerSigma, teamAvgMMR, opponentAvgMMR, scoreDiff, won]
				inputs.push([
					playerMMR / 1000, // normalize to 0-1
					playerSigma / 100, // normalize to 0-1 (assuming max sigma of 100)
					teamAvgMMR / 1000,
					opponentAvgMMR / 1000,
					scoreDiff / 25, // normalize score difference (max expected ~25)
					won,
				]);

				// target output: ideal MMR adjustment
				// this is where we encode our objective of creating closer games
				const expectedMMRDiff = teamAvgMMR - opponentAvgMMR;
				const actualOutcome = won;
				const expectedWinProb = 1 / (1 + Math.exp(-expectedMMRDiff / 100)); // sigmoid

				// if the outcome was unexpected, we need bigger adjustments
				const surprise = Math.abs(actualOutcome - expectedWinProb);

				// adjustment magnitude based on uncertainty and surprise
				const adjustmentMagnitude = (playerSigma / 100) * surprise * 20; // max ~20 MMR change

				// direction: positive if won, negative if lost
				const adjustment = won ? adjustmentMagnitude : -adjustmentMagnitude;

				outputs.push(adjustment);
			}
		}

		return {
			inputs: tf.tensor2d(inputs),
			outputs: tf.tensor2d(outputs, [outputs.length, 1]),
		};
	}

	// train the model on historical games
	async trainOnGames(games: GameResult[], epochs = 50): Promise<void> {
		if (!this.model || this.isTraining) {
			console.log("model not ready or already training");
			return;
		}

		if (games.length === 0) {
			console.log("no games to train on");
			return;
		}

		this.isTraining = true;

		try {
			const { inputs, outputs } = this.prepareTrainingData(games);

			console.log(
				`training on ${games.length} games with ${inputs.shape[0]} player examples`,
			);

			// train the model
			const history = await this.model.fit(inputs, outputs, {
				epochs,
				batchSize: 32,
				validationSplit: 0.2,
				shuffle: true,
				verbose: 0,
				callbacks: {
					onEpochEnd: (epoch, logs) => {
						if (epoch % 10 === 0) {
							console.log(
								`epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`,
							);
						}
					},
				},
			});

			// cleanup tensors
			inputs.dispose();
			outputs.dispose();

			console.log("training completed");
		} catch (error) {
			console.error("training failed:", error);
		} finally {
			this.isTraining = false;
		}
	}

	// predict MMR adjustments for a completed game
	async predictAdjustments(
		game: GameResult,
	): Promise<{ [playerId: string]: number }> {
		if (!this.model) {
			throw new Error("model not initialized");
		}

		const adjustments: { [playerId: string]: number } = {};
		const [score1, score2] = game.finalScores;
		const scoreDiff = Math.abs(score1 - score2);

		// calculate team averages
		const team1Indices = game.teamComposition[0];
		const team2Indices = game.teamComposition[1];

		const team1AvgMMR =
			team1Indices.reduce((sum, idx) => sum + game.playerMMRs[idx], 0) /
			team1Indices.length;
		const team2AvgMMR =
			team2Indices.reduce((sum, idx) => sum + game.playerMMRs[idx], 0) /
			team2Indices.length;

		// prepare input for each player
		const inputs: number[][] = [];
		for (let i = 0; i < game.playerIds.length; i++) {
			const playerMMR = game.playerMMRs[i];
			const playerSigma = game.playerSigmas[i];

			const onTeam1 = team1Indices.includes(i);
			const teamAvgMMR = onTeam1 ? team1AvgMMR : team2AvgMMR;
			const opponentAvgMMR = onTeam1 ? team2AvgMMR : team1AvgMMR;
			const won = onTeam1 ? (score1 > score2 ? 1 : 0) : score2 > score1 ? 1 : 0;

			inputs.push([
				playerMMR / 1000,
				playerSigma / 100,
				teamAvgMMR / 1000,
				opponentAvgMMR / 1000,
				scoreDiff / 25,
				won,
			]);
		}

		// get predictions
		const inputTensor = tf.tensor2d(inputs);
		const predictions = this.model.predict(inputTensor) as tf.Tensor;
		const adjustmentValues = await predictions.data();

		// map back to player IDs
		for (let i = 0; i < game.playerIds.length; i++) {
			adjustments[game.playerIds[i]] = adjustmentValues[i];
		}

		// cleanup
		inputTensor.dispose();
		predictions.dispose();

		return adjustments;
	}

	// save model to file
	async saveModel(path: string): Promise<void> {
		if (!this.model) {
			throw new Error("no model to save");
		}
		await this.model.save(`file://${path}`);
	}

	// load model from file
	async loadModel(path: string): Promise<void> {
		try {
			this.model = await tf.loadLayersModel(`file://${path}`);
			console.log("model loaded successfully");
		} catch (error) {
			console.log("failed to load model, using new model");
			this.initializeModel();
		}
	}
}
