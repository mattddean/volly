import { Player } from "../models/player";

// Calculate standard deviation
export function standardDeviation(values: number[]): number {
  const avg = average(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

// Calculate average
export function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate team average rating
export function calculateTeamRating(team: Player[]): number {
  return average(team.map((p) => p.weightedRating()));
}

// Calculate team chemistry
export function calculateTeamChemistry(team: Player[]): number {
  let chemistrySum = 0;
  let pairCount = 0;

  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const player1 = team[i];
      const player2 = team[j];

      if (player1.chemistry[player2.name]) {
        chemistrySum += player1.chemistry[player2.name];
        pairCount++;
      }

      if (player2.chemistry[player1.name]) {
        chemistrySum += player2.chemistry[player1.name];
        pairCount++;
      }
    }
  }

  return pairCount > 0 ? chemistrySum / pairCount : 0;
}
