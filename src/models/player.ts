import { format } from "date-fns";

export class Player {
	id: string;
	name: string;
	mmr: number;
	sigma: number; // uncertainty - decreases over time
	lastPlayed: Date;
	gamesPlayed: number;
	wins: number;
	pointsScored: number;
	pointsAllowed: number;

	constructor({
		id,
		name,
		mmr,
		sigma,
		lastPlayed,
	}: {
		id: string;
		name: string;
		mmr?: number;
		sigma?: number;
		lastPlayed?: Date;
	}) {
		this.id = id;
		this.name = name;
		this.mmr = mmr ?? 500; // default to middle of 0-1000 range
		this.sigma = sigma ?? 100; // high initial uncertainty
		this.lastPlayed = lastPlayed ?? new Date();

		// historical performance
		this.gamesPlayed = 0;
		this.wins = 0;
		this.pointsScored = 0;
		this.pointsAllowed = 0;
	}

	// convert from old skill group system to MMR
	static fromSkillGroup(skillGroup: string): number {
		const skillMap: { [key: string]: number } = {
			A: 833, // (5/6) * 1000
			B: 667, // (4/6) * 1000
			C: 500, // (3/6) * 1000
			D: 333, // (2/6) * 1000
			E: 167, // (1/6) * 1000
			F: 0, // (0/6) * 1000
		};
		return skillMap[skillGroup] || 500;
	}

	// get MMR with epsilon randomness for matchmaking
	getRandomizedMMR(epsilon = 10): number {
		const randomOffset = (Math.random() - 0.5) * 2 * epsilon;
		return Math.max(0, Math.min(1000, this.mmr + randomOffset));
	}

	// conservative rating estimate (MMR - 2*sigma)
	effectiveMMR(): number {
		return Math.max(0, this.mmr - 2 * this.sigma);
	}

	// confidence interval
	mmrRange(): [number, number] {
		return [
			Math.max(0, this.mmr - 2 * this.sigma),
			Math.min(1000, this.mmr + 2 * this.sigma),
		];
	}

	// win percentage
	winPercentage(): number {
		return this.gamesPlayed > 0 ? (this.wins / this.gamesPlayed) * 100 : 0;
	}

	toString(): string {
		return `${this.name} (MMR: ${this.mmr.toFixed(1)}±${this.sigma.toFixed(1)}, ${this.gamesPlayed}g, ${this.winPercentage().toFixed(1)}% win)`;
	}

	// for serialization
	toObject(): any {
		return {
			id: this.id,
			name: this.name,
			mmr: this.mmr,
			sigma: this.sigma,
			lastPlayed: format(this.lastPlayed, "yyyy-MM-dd"),
			gamesPlayed: this.gamesPlayed,
			wins: this.wins,
			pointsScored: this.pointsScored,
			pointsAllowed: this.pointsAllowed,
		};
	}
}
